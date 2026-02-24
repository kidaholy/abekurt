import { NextResponse } from "next/server"
import mongoose from "mongoose"
import { connectDB } from "@/lib/db"
import Order from "@/lib/models/order"
import MenuItem from "@/lib/models/menu-item"
import User from "@/lib/models/user"
import Stock from "@/lib/models/stock"
import { addNotification } from "@/lib/notifications"
import { calculateStockConsumption, applyStockAdjustment } from "@/lib/stock-logic"
import { validateSession } from "@/lib/auth"
import Floor from "@/lib/models/floor"
import Table from "@/lib/models/table"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production"

// High-speed In-Memory Cache for Vercel lambdas
let floorCache: { data: Map<string, string>, lastFetch: number } = { data: new Map(), lastFetch: 0 }
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getFloorMap() {
  const now = Date.now()
  if (now - floorCache.lastFetch < CACHE_TTL && floorCache.data.size > 0) {
    return floorCache.data
  }

  try {
    const floors = await Floor.find({}, { name: 1 }).lean() as any[]
    const newMap = new Map()
    floors.forEach(f => newMap.set(f._id.toString(), f.name))
    floorCache = { data: newMap, lastFetch: now }
    return newMap
  } catch (err) {
    console.error("Floor cache refresh error:", err)
    return floorCache.data // Return stale if fail
  }
}

// GET all orders with filtering
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = searchParams.get('limit')

    const decoded = await validateSession(request)
    // console.log("📋 User fetching orders:", decoded.email || decoded.id)

    await connectDB()

    let query: any = {}

    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = new Date(startDate)
      if (endDate) query.createdAt.$lte = new Date(endDate)
    }

    // RBAC: Filter by floor for display and cashier users
    if (decoded.role === 'display' || decoded.role === 'cashier') {
      if (decoded.floorId) {
        // Find all table numbers for this floor to include orders that might be missing floorId
        const floorTables = await Table.find({ floorId: decoded.floorId }, { tableNumber: 1 }).lean() as any[]
        const tableNumbers = floorTables.map((t: any) => t.tableNumber)

        query.$or = [
          { floorId: decoded.floorId },
          { tableNumber: { $in: tableNumbers } },
          { createdBy: decoded.id } // Always allow seeing their own orders
        ]
      } else if (decoded.role === 'display') {
        // Force no results if role is display but no floor is assigned
        query.floorId = new mongoose.Types.ObjectId()
      } else if (decoded.role === 'cashier') {
        // Cashiers without an assigned floor only see their own orders
        query.createdBy = decoded.id
      }
    }

    // RBAC: Filter items for chef role
    if (decoded.role === 'chef') {
      const user = await User.findById(decoded.id).lean() as any
      const assignedCategories = user?.assignedCategories || []

      // If chef has assigned categories, focus query
      if (assignedCategories.length > 0) {
        // Create regex for each category to be normalization-agnostic and case-insensitive
        const categoryRegexes = assignedCategories.map((cat: string) => {
          const escaped = cat.trim().normalize("NFC").replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          return new RegExp(`^${escaped}$`, 'i')
        })
        query["items.category"] = { $in: categoryRegexes }
      } else {
        // If no assigned categories, chef sees nothing
        return NextResponse.json([])
      }
    }

    let orderQuery = Order.find(query).sort({ createdAt: -1 })

    if (limit) {
      orderQuery = orderQuery.limit(Number(limit))
    }

    const orders = await orderQuery.lean()

    const floorMap = await getFloorMap()

    // Optimization: Pre-calculate chef settings once
    let normalizedAssigned: string[] = []
    if (decoded.role === 'chef') {
      const user = await User.findById(decoded.id).lean() as any
      const assignedCategories = user?.assignedCategories || []
      normalizedAssigned = assignedCategories.map((c: string) => c.trim().normalize("NFC").toLowerCase())
    }

    // Process orders efficiently
    const populatedOrders = orders.map((order) => {
      let floorName = order.floorName || floorMap.get(order.floorId?.toString());

      // Filter items for chefs
      let items = (order.items || []).sort((a: any, b: any) => {
        const idA = a.menuId || ""
        const idB = b.menuId || ""
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' })
      })

      if (decoded.role === 'chef') {
        items = items.filter((item: any) =>
          item.category && normalizedAssigned.includes(item.category.trim().normalize("NFC").toLowerCase())
        )
      }

      return {
        ...order,
        _id: order._id.toString(),
        floorName,
        items
      };
    });

    return NextResponse.json(populatedOrders)
  } catch (error: any) {
    console.error("❌ Get orders error:", error)
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: error.message || "Failed to get orders" }, { status })
  }
}

// POST create new order
export async function POST(request: Request) {
  try {
    const decoded = await validateSession(request)
    console.log("🔐 User creating order:", decoded.email || decoded.id)

    // Connect to database
    await connectDB()
    console.log("📊 Database connected successfully")

    const body = await request.json()
    const { items, totalAmount, subtotal, tax, paymentMethod, customerName, tableNumber, tableId } = body
    console.log("📝 Order data received:", { items: items.length, totalAmount, subtotal, tax, tableNumber, tableId })

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: "Items are required" }, { status: 400 })
    }

    if (!tableNumber) {
      return NextResponse.json({ message: "Table Number is required" }, { status: 400 })
    }

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json({ message: "Valid total amount is required" }, { status: 400 })
    }

    // 🔬 BUSINESS LOGIC: Fetch and validate in parallel
    const menuItemIds = items.map((i: any) => i.menuItemId)
    const stockConsumptionMap = await calculateStockConsumption(items)
    const stockIds = Array.from(stockConsumptionMap.keys())

    // FETCH DATA IN PARALLEL
    const [linkedMenuItems, stockItems, lastOrder, tableData] = await Promise.all([
      MenuItem.find({ _id: { $in: menuItemIds } }).populate('stockItemId'),
      Stock.find({ _id: { $in: stockIds } }),
      Order.findOne({}, { orderNumber: 1 }).sort({ orderNumber: -1 }),
      tableId ? Table.findById(tableId).populate("floorId") :
        (tableNumber && tableNumber !== "Buy&Go" ? Table.findOne({ tableNumber }).populate("floorId") : null)
    ])

    // Validate sufficient stock quantities
    for (const [stockId, requiredAmount] of stockConsumptionMap) {
      const stockItem = stockItems.find(s => s._id.toString() === stockId)
      if (stockItem && stockItem.trackQuantity) {
        const availableStock = stockItem.quantity || 0

        if (availableStock <= 0 || availableStock < requiredAmount) {
          console.error(`❌ Insufficient stock for order: ${stockItem.name}. Available: ${availableStock}, Required: ${requiredAmount}`)
          return NextResponse.json({
            message: availableStock <= 0
              ? `Order Failed: ${stockItem.name} is completely out of stock.`
              : `Insufficient stock: ${stockItem.name}. Required: ${requiredAmount} ${stockItem.unit}, Available: ${availableStock} ${stockItem.unit}`,
            insufficientStock: stockItem.name
          }, { status: 400 })
        }
      }
    }

    // Generate order number
    let orderNumber: string
    if (lastOrder && lastOrder.orderNumber) {
      const lastNumber = Number(lastOrder.orderNumber)
      orderNumber = String(lastNumber + 1).padStart(3, "0")
    } else {
      orderNumber = "001"
    }

    // Lookup floor
    let floorId = body.floorId || (decoded.role === 'cashier' ? decoded.floorId : undefined)
    let floorName = body.floorName || ""

    if (tableData && tableData.floorId) {
      floorId = tableData.floorId._id
      floorName = tableData.floorId.name
    } else if (floorId && !floorName) {
      // Small optimization: only fetch floor if we don't have the name yet
      const floor = await Floor.findById(floorId).lean()
      if (floor) floorName = (floor as any).name
    }

    // Create order data
    const orderData = {
      orderNumber,
      items: items.map((item: any) => {
        const menu = linkedMenuItems.find(m => m._id.toString() === item.menuItemId)
        return {
          ...item,
          menuId: menu?.menuId,
          category: menu?.category, // Store category for kitchen routing
          status: "pending",
          modifiers: item.modifiers || [],
          notes: item.notes || ""
        }
      }).sort((a: any, b: any) => {
        const idA = a.menuId || ""
        const idB = b.menuId || ""
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' })
      }),
      totalAmount,
      subtotal: subtotal || totalAmount,
      tax: tax || 0,
      status: "pending" as const,
      paymentMethod: paymentMethod || "cash",
      customerName: customerName || `Table ${tableNumber}`,
      tableNumber,
      tableId,
      floorId,
      floorName,
      createdBy: decoded.id,
    }

    console.log("💾 Creating order in database:", orderData)

    // Create order
    const order = await Order.create(orderData)
    console.log("✅ Order saved to database:", order._id)

    // 📉 BUSINESS LOGIC: Commit initial stock deduction
    try {
      const stockAdjustments = await applyStockAdjustment(stockConsumptionMap, -1)
      console.log("📉 Initial stock deduction applied:", stockAdjustments.length, "items updated")
    } catch (stockError) {
      console.error("❌ Failed to update initial stock quantities:", stockError)
    }

    // Send notifications to kitchen staff (Fire and Forget - don't await)
    try {
      // Create a background promise but don't await it
      (async () => {
        try {
          addNotification(
            "info",
            `🍽️ New Order #${order.orderNumber} - ${order.items.length} items (${order.totalAmount} Br)`,
            "chef"
          )

          addNotification(
            "success",
            `✅ Order #${order.orderNumber} created successfully`,
            "cashier"
          )

          addNotification(
            "info",
            `📋 New Order #${order.orderNumber} received - Total: ${order.totalAmount} Br`,
            "admin"
          )

          console.log(`✅ New order notifications sent for order: ${order.orderNumber}`)
        } catch (err) {
          console.error("Background notification error:", err)
        }
      })()
    } catch (error) {
      console.error("❌ Failed to initiate order notifications:", error)
    }

    // Return order with string ID
    const serializedOrder = {
      ...order.toObject(),
      _id: order._id.toString()
    }

    return NextResponse.json(serializedOrder, { status: 201 })
  } catch (error: any) {
    console.error("Create order error:", error)
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: error.message || "Failed to create order" }, { status })
  }
}
