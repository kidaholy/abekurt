import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Batch from "@/lib/models/batch"
import Table from "@/lib/models/table"
import { validateSession } from "@/lib/auth"

// Middleware helper to verify admin access
const verifyAdmin = async (request: Request) => {
    try {
        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") return null
        return decoded
    } catch (error) {
        return null
    }
}

export async function GET(request: Request) {
    try {
        if (!(await verifyAdmin(request))) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

        await connectDB()
        const batches = await Batch.find({}).sort({ order: 1 })
        return NextResponse.json(batches)
    } catch (error: any) {
        return NextResponse.json({ message: "Failed to fetch batches" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        if (!(await verifyAdmin(request))) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

        await connectDB()
        const { batchNumber, description, order } = await request.json()

        if (!batchNumber) {
            return NextResponse.json({ message: "Batch Number is required" }, { status: 400 })
        }

        const batch = await Batch.create({ batchNumber, description, order: order || 0 })
        return NextResponse.json(batch, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ message: error.message || "Failed to create batch" }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        if (!(await verifyAdmin(request))) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

        await connectDB()
        const { id, batchNumber, description, order, isActive } = await request.json()

        if (!id) {
            return NextResponse.json({ message: "ID is required" }, { status: 400 })
        }

        const updatedBatch = await Batch.findByIdAndUpdate(
            id,
            { batchNumber, description, order, isActive },
            { new: true }
        )

        if (!updatedBatch) {
            return NextResponse.json({ message: "Batch not found" }, { status: 404 })
        }

        return NextResponse.json(updatedBatch)
    } catch (error: any) {
        return NextResponse.json({ message: error.message || "Failed to update batch" }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        if (!(await verifyAdmin(request))) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        if (!id) return NextResponse.json({ message: "ID is required" }, { status: 400 })

        await connectDB()

        // 1. Find the batch to get its batchNumber if needed for unassigning/cascading
        const batch = await Batch.findById(id)
        if (!batch) return NextResponse.json({ message: "Batch not found" }, { status: 404 })

        // 2. Cascade delete or unassign tables
        // For now, let's keep the unassign logic but rename the field
        await Table.updateMany({ batchId: id }, { $unset: { batchId: "" } })

        await Batch.findByIdAndDelete(id)
        return NextResponse.json({ message: "Batch deleted" })
    } catch (error: any) {
        return NextResponse.json({ message: "Failed to delete batch" }, { status: 500 })
    }
}
