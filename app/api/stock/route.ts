import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Stock from "@/lib/models/stock"
import { validateSession } from "@/lib/auth"

// GET all stock items with enhanced filtering and availability checking
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const includeHistory = searchParams.get("includeHistory") === "true"
        const availableOnly = searchParams.get("availableOnly") === "true"
        const category = searchParams.get("category")

        const decoded = await validateSession(request)
        console.log("📦 Admin fetching stock items:", decoded.email || decoded.id)

        if (decoded.role !== "admin" && decoded.role !== "super-admin" && decoded.role !== "store_keeper") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()
        console.log("📊 Database connected for stock retrieval")

        // Build query
        let query: any = {}
        if (availableOnly) {
            query.status = 'active'
            query.quantity = { $gt: 0 }
        }
        if (category) {
            query.category = category
        }

        let stockQuery = Stock.find(query).sort({ name: 1 })

        // Conditionally include restock history
        if (!includeHistory) {
            stockQuery = stockQuery.select('-restockHistory')
        }

        const stockItems = await stockQuery.lean()
        console.log(`📦 Found ${stockItems.length} stock items in database`)

        // Convert ObjectId to string for frontend compatibility and add computed fields
        const serializedItems = stockItems.map(item => {
            // Handle migration from old purchasePrice to averagePurchasePrice
            const avgPurchasePrice = item.averagePurchasePrice || item.purchasePrice || 0

            return {
                ...item,
                _id: item._id.toString(),
                averagePurchasePrice: avgPurchasePrice, // Ensure this field exists
                storeQuantity: item.storeQuantity || 0, // Expose Store Quantity
                totalValue: (item.quantity || 0) * avgPurchasePrice, // Current Stock Value
                storeValue: (item.storeQuantity || 0) * avgPurchasePrice, // Current Store Value
                totalLifetimeInvestment: item.totalInvestment || 0,
                totalLifetimePurchased: item.totalPurchased || 0,
                sellingValue: (item.quantity || 0) * (item.unitCost || 0), // Potential revenue
                profitMargin: (item.unitCost || 0) > 0 ? (((item.unitCost - avgPurchasePrice) / item.unitCost) * 100).toFixed(1) : 0,
                isLowStock: item.trackQuantity && (item.quantity || 0) <= (item.minLimit || 0),
                isLowStoreStock: item.trackQuantity && (item.storeQuantity || 0) <= (item.storeMinLimit || 0),
                isOutOfStock: item.trackQuantity && (item.quantity || 0) <= 0,
                availableForOrder: item.trackQuantity ? (item.status === 'active' && (item.quantity || 0) > 0) : true
            }
        })

        return NextResponse.json(serializedItems)
    } catch (error: any) {
        console.error("❌ Get stock error:", error)
        const status = error.message?.includes("Unauthorized") ? 401 : 500
        return NextResponse.json({ message: error.message || "Failed to get stock items" }, { status })
    }
}

// POST create new stock item with initial restock
export async function POST(request: Request) {
    try {
        const decoded = await validateSession(request)
        console.log("🔐 Admin creating stock item:", decoded.email || decoded.id)

        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()
        console.log("📊 Database connected for stock creation")

        const body = await request.json()
        console.log("📝 Stock data received:", body)

        // Validate unit type based on unit
        let unitType = 'count' // default
        const unit = body.unit?.toLowerCase()
        if (['kg', 'g', 'gram', 'kilogram'].includes(unit)) {
            unitType = 'weight'
        } else if (['l', 'ml', 'liter', 'litre', 'milliliter'].includes(unit)) {
            unitType = 'volume'
        }

        const stockData = {
            ...body,
            unitType,
            quantity: 0, // Initial stock is ALWAYS 0, everything goes to store
            storeQuantity: Number(body.storeQuantity || body.quantity) || 0,
            minLimit: body.minLimit || 0,
            storeMinLimit: body.storeMinLimit || 0,
            averagePurchasePrice: body.quantity > 0 ? (body.totalPurchaseCost || 0) / body.quantity : 0,
            unitCost: body.unitCost || 0,
            totalPurchased: body.quantity || 0,
            totalConsumed: 0,
            totalInvestment: body.totalPurchaseCost || 0
        }

        const newStock = new Stock(stockData)

        // If initial quantity > 0, log it in StoreLog
        if (stockData.storeQuantity > 0) {
            const StoreLog = (await import("@/lib/models/store-log")).default
            await StoreLog.create({
                stockId: newStock._id,
                type: 'PURCHASE',
                quantity: stockData.storeQuantity,
                unit: stockData.unit,
                pricePerUnit: stockData.averagePurchasePrice,
                totalPrice: stockData.totalInvestment,
                user: decoded.id,
                notes: "Initial inventory entry (Store)"
            })

            // Also add to restock history for compatibility/legacy reporting
            newStock.restockHistory.push({
                date: new Date(),
                quantityAdded: stockData.storeQuantity,
                totalPurchaseCost: Number(body.totalPurchaseCost) || 0,
                unitCostAtTime: stockData.unitCost,
                notes: "Initial store entry",
                restockedBy: decoded.id
            })
        }

        await newStock.save()
        console.log("✅ Stock item created successfully:", newStock._id)

        const serializedStock = {
            ...newStock.toObject(),
            _id: newStock._id.toString(),
            totalValue: (newStock.quantity + newStock.storeQuantity) * newStock.averagePurchasePrice,
            sellingValue: (newStock.quantity + newStock.storeQuantity) * newStock.unitCost,
            profitMargin: newStock.unitCost > 0 ? ((newStock.unitCost - newStock.averagePurchasePrice) / newStock.unitCost * 100).toFixed(1) : 0,
            isLowStock: newStock.trackQuantity && newStock.quantity <= newStock.minLimit,
            isLowStoreStock: newStock.trackQuantity && newStock.storeQuantity <= newStock.storeMinLimit,
            isOutOfStock: newStock.trackQuantity && newStock.quantity <= 0,
            availableForOrder: newStock.trackQuantity ? (newStock.status === 'active' && newStock.quantity > 0) : true
        }

        return NextResponse.json(serializedStock, { status: 201 })
    } catch (error: any) {
        console.error("❌ Create stock error:", error)
        const status = error.message?.includes("Unauthorized") ? 401 : 500
        return NextResponse.json({ message: error.message || "Failed to create stock item" }, { status })
    }
}
