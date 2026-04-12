import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Distribution from "@/lib/models/distribution"
import { validateSession } from "@/lib/auth"

// GET all distributions
export async function GET(request: Request) {
    try {
        await validateSession(request)
        await connectDB()

        const distributions = await (Distribution as any).find({}).sort({ name: 1 }).lean()

        return NextResponse.json(distributions)
    } catch (error: any) {
        console.error("❌ Get distributions error:", error)
        const status = error.message?.includes("Unauthorized") ? 401 : 500
        return NextResponse.json({ message: error.message || "Failed to get distributions" }, { status })
    }
}

// POST create new distribution (Admin only)
export async function POST(request: Request) {
    try {
        const decoded = await validateSession(request)
        if (decoded.role !== "admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()

        const body = await request.json()
        const { name, description } = body

        if (!name) {
            return NextResponse.json({ message: "Name is required" }, { status: 400 })
        }

        const newDistribution = new Distribution({
            name: name.trim(),
            description: description?.trim()
        })
        await newDistribution.save()

        return NextResponse.json(newDistribution, { status: 201 })
    } catch (error: any) {
        console.error("❌ Create distribution error:", error)
        const status = error.message?.includes("Unauthorized") ? 401 : 500
        return NextResponse.json({ message: error.message || "Failed to create distribution" }, { status })
    }
}
