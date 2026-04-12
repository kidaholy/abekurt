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
import Batch from "@/lib/models/batch"
import Table from "@/lib/models/table"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production"

// High-speed In-Memory Cache for Vercel lambdas
let batchCache: { data: Map<string, string>, lastFetch: number } = { data: new Map(), lastFetch: 0 }
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getBatchMap() {
  const now = Date.now()
  if (now - batchCache.lastFetch < CACHE_TTL && batchCache.data.size > 0) {
    return batchCache.data
  }

  try {
    const batches = await Batch.find({}, { batchNumber: 1 }).lean() as any[]
    const newMap = new Map()
    batches.forEach(b => newMap.set(b._id.toString(), b.batchNumber))
    batchCache = { data: newMap, lastFetch: now }
    return newMap
  } catch (err) {
    console.error("Batch cache refresh error:", err)
    return batchCache.data // Return stale if fail
  }
}

// GET all orders with filtering
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = searchParams.get('limit')
    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    const mainCategory = searchParams.get('mainCategory') // 'Food' or 'Drinks'

    const decoded = await validateSession(request)
    // console.log("📋 User fetching orders:", decoded.email || decoded.id)

    await connectDB()

    let query: any = includeDeleted ? {} : { isDeleted: { $ne: true } }

    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = new Date(startDate)
      if (endDate) query.createdAt.$lte = new Date(endDate)
    }

    // RBAC: Filter by batch for display and cashier users
    if (decoded.role === 'display' || decoded.role === 'cashier') {
      if (decoded.batchId) {
        // Find all table numbers for this batch to include orders that might be missing batchId
        const thresholdSetting = await (Settings as any).findOne({ key: "PREPARATION_TIME_THRESHOLD" })
        const batchTables = await (Table as any).find({ batchId: decoded.batchId }, { tableNumber: 1 }).lean() as any[]
        const tableNumbers = batchTables.map((t: any) => t.tableNumber)

        query.$or = [
          { batchId: decoded.batchId },
          { tableNumber: { $in: tableNumbers } },
          { createdBy: decoded.id } // Always allow seeing their own orders
        ]
      } else if (decoded.role === 'display') {
        // Force no results if role is display but no batch is assigned
        query.batchId = new mongoose.Types.ObjectId()
      } else if (decoded.role === 'cashier') {
        // Cashiers without an assigned batch only see their own orders
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

    // Filter by mainCategory if provided
    if (mainCategory) {
      query["items.mainCategory"] = mainCategory
    }

    let orderQuery = (Order as any).find(query).sort({ createdAt: -1 })

    if (limit) {
      orderQuery = orderQuery.limit(Number(limit))
    }

    const orders = await orderQuery.lean()

    const batchMap = await getBatchMap()

    // Optimization: Pre-calculate chef settings once
    let normalizedAssigned: string[] = []
    if (decoded.role === 'chef') {
      const user = await User.findById(decoded.id).lean() as any
      const assignedCategories = user?.assignedCategories || []
      normalizedAssigned = assignedCategories.map((c: string) => c.trim().normalize("NFC").toLowerCase())
    }

    // Process orders efficiently
    const populatedOrders = orders.map((order: any) => {
      let batchNumber = order.batchNumber || batchMap.get(order.batchId?.toString());

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
        isDeleted: !!order.isDeleted,
        batchNumber,
        items,
        distribution: order.distribution || "",
        distributions: order.distributions || (order.distribution ? [order.distribution] : [])
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
    const { items, totalAmount, subtotal, tax, paymentMethod, customerName, tableNumber, tableId, distribution, distributions } = body
    console.log("📝 Order data received:", { items: items.length, totalAmount, subtotal, tax, tableNumber, tableId, distribution, distributions })

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
    const [linkedMenuItems, stockItems, recentOrders, tableData] = await Promise.all([
      MenuItem.find({ _id: { $in: menuItemIds } }).populate('stockItemId'),
      Stock.find({ _id: { $in: stockIds } }),
      // Fetch the last 50 numeric orders to find the true numeric maximum
      (Order as any).find({ orderNumber: /^\d+$/ }, { orderNumber: 1 }).sort({ createdAt: -1 }).limit(50).lean(),
      tableId ? (Table as any).findById(tableId) :
        (tableNumber && tableNumber !== "Buy&Go" ? (Table as any).findOne({ tableNumber }) : null)
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

    // Robust Order Number Generation: Find absolute max from recent numeric orders
    const numericOrders = (recentOrders as any[]).map(o => parseInt(o.orderNumber, 10)).filter(n => !isNaN(n));
    const maxOrderNumber = numericOrders.length > 0 ? Math.max(...numericOrders) : 0;
    let nextOrderNumber = maxOrderNumber + 1;

    // Lookup batch
    let batchId = body.batchId || (decoded.role === 'cashier' ? decoded.batchId : undefined)
    let batchNumber = body.batchNumber || ""

    if (batchId && !batchNumber) {
      // Fetch batch number if we don't have it yet
      const batch = await (Batch as any).findById(batchId).lean()
      if (batch) batchNumber = (batch as any).batchNumber
    }

    // Create order data
    const orderData = {
      items: items.map((item: any) => {
        const menu = linkedMenuItems.find(m => m._id.toString() === item.menuItemId)
        const isDrink = menu?.mainCategory?.toLowerCase() === "drinks"

        return {
          ...item,
          menuId: menu?.menuId,
          category: menu?.category, // Store category for kitchen routing
          mainCategory: menu?.mainCategory, // Persist for accurate reporting separation
          preparationTime: isDrink ? 0 : (menu?.preparationTime || 0),
          status: isDrink ? "served" : "pending",          modifiers: item.modifiers || [],
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
      status: items.every((item: any) => {
        const menu = linkedMenuItems.find(m => m._id.toString() === item.menuItemId)
        return menu?.mainCategory?.toLowerCase() === "drinks"
      }) ? "served" : "cooking",
      paymentMethod: paymentMethod || "cash",
      customerName: customerName || `Table ${tableNumber}`,
      tableNumber,
      tableId,
      distribution: distribution || (distributions && distributions.length > 0 ? distributions[0] : ""),
      distributions: distributions || (distribution ? [distribution] : []),
      batchId,
      batchNumber,
      createdBy: decoded.id,
      thresholdMinutes: (() => {
        const foodItems = linkedMenuItems.filter(m => m.mainCategory?.toLowerCase() !== "drinks")
        if (foodItems.length === 0) return 0
        return Math.max(...foodItems.map(m => m.preparationTime || 10))
      })() || 10
    }

    // 🔥 RETRY LOOP: Handle rare race conditions for duplicate orderNumber
    let order: any;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount <= maxRetries) {
      try {
        const orderNumberStr = String(nextOrderNumber).padStart(3, "0");
        console.log(`Attempting to create order with number: ${orderNumberStr} (Attempt ${retryCount + 1})`);

        // Create order data with the specific orderNumber
        const finalOrderData = {
          ...orderData,
          orderNumber: orderNumberStr
        };

        order = await (Order as any).create(finalOrderData);
        console.log("✅ Order saved to database:", order._id);
        break; // Success!
      } catch (err: any) {
        // Check if it's a duplicate key error for orderNumber
        if (err.code === 11000 && err.message.includes('orderNumber')) {
          console.warn(`⚠️ Duplicate orderNumber ${nextOrderNumber} detected. Retrying with next increment...`);
          nextOrderNumber++;
          retryCount++;
          if (retryCount > maxRetries) throw new Error("Failed to generate unique order number after multiple attempts");
        } else {
          // It's some other error, throw it
          throw err;
        }
      }
    }

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
