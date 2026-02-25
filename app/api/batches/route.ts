import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Batch from "@/lib/models/batch"
import { validateSession } from "@/lib/auth"

export async function GET(request: Request) {
    try {
        await validateSession(request)
        await connectDB()
        // Only fetch active batches for POS/Public view, sorted by order
        const batches = await Batch.find({ isActive: true }).sort({ order: 1 })
        return NextResponse.json(batches)
    } catch (error: any) {
        console.error("Failed to fetch batches:", error)
        return NextResponse.json({ message: "Failed to fetch batches" }, { status: 500 })
    }
}
