import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Stock from "@/lib/models/stock"
import StoreLog from "@/lib/models/store-log"
import { validateSession } from "@/lib/auth"

export async function POST(request: Request) {
    try {
        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()

        const { stockId, quantity, notes } = await request.json()

        if (!stockId || !quantity || quantity <= 0) {
            return NextResponse.json({ message: "Invalid parameters" }, { status: 400 })
        }

        const stockItem = await Stock.findById(stockId)
        if (!stockItem) {
            return NextResponse.json({ message: "Stock item not found" }, { status: 404 })
        }

        if (stockItem.storeQuantity < quantity) {
            return NextResponse.json({
                message: `Insufficient store quantity. Available: ${stockItem.storeQuantity}`
            }, { status: 400 })
        }

        // Perform transfer
        stockItem.storeQuantity -= quantity
        stockItem.quantity += quantity

        // Ensure status is updated if it was out of stock
        if (stockItem.quantity > 0 && stockItem.status === 'out_of_stock') {
            stockItem.status = 'active'
        }

        await stockItem.save()

        // Log transfer
        await StoreLog.create({
            stockId: stockItem._id,
            type: 'TRANSFER_OUT',
            quantity: quantity,
            unit: stockItem.unit,
            user: decoded.id,
            notes: notes || "Manual transfer to stock"
        })

        return NextResponse.json({
            message: "Transfer successful",
            stockQuantity: stockItem.quantity,
            storeQuantity: stockItem.storeQuantity
        })

    } catch (error: any) {
        console.error("❌ Store transfer error:", error)
        const status = error.message?.includes("Unauthorized") ? 401 : 500
        return NextResponse.json({ message: error.message || "Failed to transfer item" }, { status })
    }
}
