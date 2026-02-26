import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import TransferRequest from "@/lib/models/transfer-request"
import Stock from "@/lib/models/stock"
import StoreLog from "@/lib/models/store-log"
import { validateSession } from "@/lib/auth"
import mongoose from "mongoose"
import User from "@/lib/models/user"
import { addNotification } from "@/lib/notifications"

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await validateSession(request)
        if (user.role !== 'admin') {
            return NextResponse.json({ message: "Only admins can approve transfers" }, { status: 403 })
        }

        const { id } = await params
        const { action, denialReason } = await request.json()

        if (!['approved', 'denied'].includes(action)) {
            return NextResponse.json({ message: "Invalid action" }, { status: 400 })
        }

        await connectDB()

        const transferReq = await TransferRequest.findById(id)
        if (!transferReq) {
            return NextResponse.json({ message: "Transfer request not found" }, { status: 404 })
        }

        if (transferReq.status !== 'pending') {
            return NextResponse.json({ message: "Request already handled" }, { status: 400 })
        }

        if (action === 'denied') {
            transferReq.status = 'denied'
            transferReq.denialReason = denialReason
            transferReq.handledBy = user.id as any
            await transferReq.save()

            // Notify requester
            addNotification(
                "error",
                `Transfer Request for ${transferReq.quantity} units was denied. Reason: ${denialReason || 'No reason provided'}`,
                undefined,
                transferReq.requestedBy.toString()
            )

            return NextResponse.json(transferReq)
        }

        // Approval Flow - MUST BE ATOMIC
        const session = await mongoose.startSession()
        session.startTransaction()

        try {
            const stockItem = await Stock.findById(transferReq.stockId).session(session)
            if (!stockItem) {
                throw new Error("Stock item not found")
            }

            if (stockItem.storeQuantity < transferReq.quantity) {
                throw new Error(`Insufficient store quantity. Current: ${stockItem.storeQuantity}`)
            }

            // Perform moves
            stockItem.storeQuantity -= transferReq.quantity
            stockItem.quantity += transferReq.quantity
            await stockItem.save({ session })

            // Log the transfer
            await StoreLog.create([{
                stockId: transferReq.stockId,
                type: 'TRANSFER_OUT',
                quantity: transferReq.quantity,
                unit: stockItem.unit,
                user: user.id,
                notes: `Internal Transfer (Approved Request: ${transferReq._id}). ${transferReq.notes || ''}`,
                date: new Date()
            }], { session })

            // Update request
            transferReq.status = 'approved'
            transferReq.handledBy = user.id as any
            await transferReq.save({ session })

            // Notify requester
            addNotification(
                "success",
                `Transfer Request for ${transferReq.quantity} units of ${stockItem.name} was approved!`,
                undefined,
                transferReq.requestedBy.toString()
            )

            await session.commitTransaction()
            return NextResponse.json(transferReq)
        } catch (err: any) {
            await session.abortTransaction()
            return NextResponse.json({ message: err.message }, { status: 400 })
        } finally {
            session.endSession()
        }

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: error.message.includes("Unauthorized") ? 401 : 500 })
    }
}
