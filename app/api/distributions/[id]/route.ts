import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Distribution from "@/lib/models/distribution"
import { validateSession } from "@/lib/auth"

// PUT update distribution
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const decoded = await validateSession(request)
        if (decoded.role !== "admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()

        const body = await request.json()
        const { name, description } = body

        const updatedDistribution = await (Distribution as any).findByIdAndUpdate(
            id,
            { name: name?.trim(), description: description?.trim() },
            { new: true }
        )

        if (!updatedDistribution) {
            return NextResponse.json({ message: "Distribution not found" }, { status: 404 })
        }

        return NextResponse.json(updatedDistribution)
    } catch (error: any) {
        console.error("❌ Update distribution error:", error)
        const status = error.message?.includes("Unauthorized") ? 401 : 500
        return NextResponse.json({ message: error.message || "Failed to update distribution" }, { status })
    }
}

// DELETE distribution
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const decoded = await validateSession(request)
        if (decoded.role !== "admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()

        const deletedDistribution = await (Distribution as any).findByIdAndDelete(id)

        if (!deletedDistribution) {
            return NextResponse.json({ message: "Distribution not found" }, { status: 404 })
        }

        return NextResponse.json({ message: "Distribution deleted successfully" })
    } catch (error: any) {
        console.error("❌ Delete distribution error:", error)
        const status = error.message?.includes("Unauthorized") ? 401 : 500
        return NextResponse.json({ message: error.message || "Failed to delete distribution" }, { status })
    }
}
