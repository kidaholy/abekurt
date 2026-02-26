import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import FixedAsset from "@/lib/models/fixed-asset"
import { validateSession } from "@/lib/auth"

// GET all fixed assets
export async function GET(request: Request) {
    try {
        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin" && decoded.role !== "store_keeper") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()

        const { searchParams } = new URL(request.url)
        const status = searchParams.get("status")
        const category = searchParams.get("category")

        let query: any = {}
        if (status) query.status = status
        if (category) query.category = category

        const assets = await FixedAsset.find(query).sort({ createdAt: -1 }).lean()

        const serialized = assets.map((a: any) => ({
            ...a,
            _id: a._id.toString(),
            dismissals: (a.dismissals || []).map((d: any) => ({
                ...d,
                _id: d._id?.toString(),
                dismissedBy: d.dismissedBy?.toString()
            }))
        }))

        return NextResponse.json(serialized)
    } catch (error: any) {
        console.error("❌ Get fixed assets error:", error)
        const status = error.message?.includes("Unauthorized") ? 401 : 500
        return NextResponse.json({ message: error.message || "Failed to get fixed assets" }, { status })
    }
}

// POST create new fixed asset
export async function POST(request: Request) {
    try {
        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()

        const body = await request.json()
        const { name, category, quantity, unitPrice, purchaseDate, notes } = body

        if (!name || !quantity || !unitPrice) {
            return NextResponse.json({ message: "Name, quantity, and unit price are required" }, { status: 400 })
        }

        const qty = Number(quantity)
        const price = Number(unitPrice)
        const totalValue = qty * price

        const asset = await FixedAsset.create({
            name,
            category: category || "General",
            quantity: qty,
            unitPrice: price,
            totalValue,
            totalInvested: totalValue,
            purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
            notes,
            status: 'active',
            dismissals: []
        })

        return NextResponse.json({
            ...asset.toObject(),
            _id: asset._id.toString()
        }, { status: 201 })
    } catch (error: any) {
        console.error("❌ Create fixed asset error:", error)
        const status = error.message?.includes("Unauthorized") ? 401 : 500
        return NextResponse.json({ message: error.message || "Failed to create fixed asset" }, { status })
    }
}
