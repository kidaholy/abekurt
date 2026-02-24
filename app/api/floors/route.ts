import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Floor from "@/lib/models/floor"
import { validateSession } from "@/lib/auth"

export async function GET(request: Request) {
    try {
        await validateSession(request)
        await connectDB()
        // Only fetch active floors for POS/Public view, sorted by order
        const floors = await Floor.find({ isActive: true }).sort({ order: 1 })
        return NextResponse.json(floors)
    } catch (error: any) {
        console.error("Failed to fetch floors:", error)
        return NextResponse.json({ message: "Failed to fetch floors" }, { status: 500 })
    }
}
