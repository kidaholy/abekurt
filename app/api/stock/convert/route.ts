import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Stock from "@/lib/models/stock"
import { validateSession } from "@/lib/auth"

export async function POST(request: Request) {
    try {
        const decoded = await validateSession(request)
        if (decoded.role !== "admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()

        const { sourceId, targetId, sourceQuantity, targetYield } = await request.json()

        if (!sourceId || !targetId || !sourceQuantity || !targetYield) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
        }

        // Validate quantities are positive
        if (sourceQuantity <= 0 || targetYield <= 0) {
            return NextResponse.json({ message: "Quantities must be greater than 0" }, { status: 400 })
        }

        // 1. Decrement source
        const sourceItem = await Stock.findById(sourceId)
        if (!sourceItem || sourceItem.quantity < sourceQuantity) {
            return NextResponse.json({ message: "Insufficient source quantity" }, { status: 400 })
        }

        const oldSourceQuantity = sourceItem.quantity
        sourceItem.quantity = Math.round((sourceItem.quantity - sourceQuantity) * 10000) / 10000
        await sourceItem.save()

        // 2. Increment target
        const targetItem = await Stock.findById(targetId)
        if (!targetItem) {
            return NextResponse.json({ message: "Target item not found" }, { status: 404 })
        }

        const oldTargetQuantity = targetItem.quantity
        targetItem.quantity = Math.round((targetItem.quantity + targetYield) * 10000) / 10000
        await targetItem.save()

        // Log the conversion
        const StoreLog = (await import("@/lib/models/store-log")).default
        
        // Log Outgoing for Source
        await StoreLog.create({
            stockId: sourceItem._id,
            type: 'CONVERSION',
            quantity: -Math.abs(sourceQuantity),
            unit: sourceItem.unit,
            user: decoded.id,
            location: 'POS',
            notes: `Converted to ${targetItem.name} (yield: ${targetYield} ${targetItem.unit})`
        })

        // Log Incoming for Target
        await StoreLog.create({
            stockId: targetItem._id,
            type: 'CONVERSION',
            quantity: Math.abs(targetYield),
            unit: targetItem.unit,
            user: decoded.id,
            location: 'POS',
            notes: `Converted from ${sourceItem.name} (waste: ${sourceQuantity} ${sourceItem.unit})`
        })

        return NextResponse.json({
            message: "Conversion successful",
            source: { name: sourceItem.name, newQuantity: sourceItem.quantity },
            target: { name: targetItem.name, newQuantity: targetItem.quantity }
        })

    } catch (error: any) {
        console.error("❌ Stock conversion error:", error)
        return NextResponse.json({ message: error.message || "Failed to convert stock" }, { status: 500 })
    }
}
