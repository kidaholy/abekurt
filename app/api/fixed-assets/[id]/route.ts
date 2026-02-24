import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import FixedAsset from "@/lib/models/fixed-asset"
import { validateSession } from "@/lib/auth"

// PUT update asset or dismiss
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()
        const body = await request.json()
        const { id } = await params

        const asset = await FixedAsset.findById(id)
        if (!asset) {
            return NextResponse.json({ message: "Asset not found" }, { status: 404 })
        }

        // Dismissal action
        if (body.action === 'dismiss') {
            const { quantity, reason, valueLost } = body

            if (!quantity || !reason) {
                return NextResponse.json({ message: "Quantity and reason are required for dismissal" }, { status: 400 })
            }

            const dismissQty = Number(quantity)
            const lostValue = Number(valueLost || 0) || (dismissQty * asset.unitPrice)

            if (dismissQty > asset.quantity) {
                return NextResponse.json({ message: `Cannot dismiss ${dismissQty}. Only ${asset.quantity} remaining.` }, { status: 400 })
            }

            asset.dismissals.push({
                date: new Date(),
                quantity: dismissQty,
                reason,
                valueLost: lostValue,
                dismissedBy: decoded.id
            })

            asset.quantity -= dismissQty
            asset.totalValue = Math.max(0, asset.totalValue - lostValue)

            await asset.save()

            return NextResponse.json({
                message: `Dismissed ${dismissQty} unit(s). Value decreased by ${lostValue.toLocaleString()} ETB.`,
                asset: { ...asset.toObject(), _id: asset._id.toString() }
            })
        }

        // Regular update
        if (body.name) asset.name = body.name
        if (body.category) asset.category = body.category
        if (body.notes !== undefined) asset.notes = body.notes
        if (body.unitPrice) {
            asset.unitPrice = Number(body.unitPrice)
            asset.totalValue = asset.quantity * asset.unitPrice
        }
        if (body.purchaseDate) asset.purchaseDate = new Date(body.purchaseDate)

        await asset.save()

        return NextResponse.json({
            ...asset.toObject(),
            _id: asset._id.toString()
        })
    } catch (error: any) {
        console.error("❌ Update fixed asset error:", error)
        const status = error.message?.includes("Unauthorized") ? 401 : 500
        return NextResponse.json({ message: error.message || "Failed to update fixed asset" }, { status })
    }
}

// DELETE remove an asset
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()
        const { id } = await params

        const deleted = await FixedAsset.findByIdAndDelete(id)
        if (!deleted) {
            return NextResponse.json({ message: "Asset not found" }, { status: 404 })
        }

        return NextResponse.json({ message: "Asset deleted successfully" })
    } catch (error: any) {
        console.error("❌ Delete fixed asset error:", error)
        const status = error.message?.includes("Unauthorized") ? 401 : 500
        return NextResponse.json({ message: error.message || "Failed to delete fixed asset" }, { status })
    }
}
