import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import TransferRequest from "@/lib/models/transfer-request"
import { validateSession } from "@/lib/auth"
import Stock from "@/lib/models/stock"
import User from "@/lib/models/user"
import { addNotification } from "@/lib/notifications"

export async function GET(request: Request) {
    try {
        const user = await validateSession(request)
        await connectDB()

        const { searchParams } = new URL(request.url)
        const status = searchParams.get("status")

        // Filter logic: 
        // Admins see all. Store Keepers see their own?
        // Actually, store keepers probably need to see all pending/theirs.
        const query: any = {}
        if (status) query.status = status
        if (user.role === 'store_keeper') {
            query.requestedBy = user.id
        }

        const requests = await TransferRequest.find(query)
            .populate("stockId", "name unit unitType storeQuantity quantity")
            .populate("requestedBy", "name")
            .populate("handledBy", "name")
            .sort({ createdAt: -1 })

        return NextResponse.json(requests)
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: error.message.includes("Unauthorized") ? 401 : 500 })
    }
}

export async function POST(request: Request) {
    try {
        const user = await validateSession(request)
        if (user.role !== 'admin' && user.role !== 'store_keeper') {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        const { stockId, quantity, notes } = await request.json()
        if (!stockId || !quantity || quantity <= 0) {
            return NextResponse.json({ message: "Invalid stock ID or quantity" }, { status: 400 })
        }

        await connectDB()

        // Check if stock exists
        const stockItem = await Stock.findById(stockId)
        if (!stockItem) {
            return NextResponse.json({ message: "Stock item not found" }, { status: 404 })
        }

        // Check if there's enough in store
        if (stockItem.storeQuantity < quantity) {
            return NextResponse.json({ message: `Insufficient store quantity. Available: ${stockItem.storeQuantity}` }, { status: 400 })
        }

        const transferRequest = await TransferRequest.create({
            stockId,
            quantity,
            notes,
            requestedBy: user.id,
            status: 'pending'
        })

        // Notify admins
        addNotification(
            "info",
            `New Transfer Request: ${quantity} units of ${stockItem.name} requested by ${user.name}`,
            "admin"
        )

        return NextResponse.json(transferRequest, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: error.message.includes("Unauthorized") ? 401 : 500 })
    }
}
