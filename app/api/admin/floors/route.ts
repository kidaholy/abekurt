import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { connectDB } from "@/lib/db"
import Floor from "@/lib/models/floor"
import Table from "@/lib/models/table"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production"

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
        const floors = await Floor.find({}).sort({ order: 1 })
        return NextResponse.json(floors)
    } catch (error: any) {
        return NextResponse.json({ message: "Failed to fetch floors" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        if (!(await verifyAdmin(request))) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

        await connectDB()
        const { name, description, order } = await request.json()

        if (!name) {
            return NextResponse.json({ message: "Name is required" }, { status: 400 })
        }

        const floor = await Floor.create({ name, description, order: order || 0 })
        return NextResponse.json(floor, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ message: error.message || "Failed to create floor" }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        if (!(await verifyAdmin(request))) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

        await connectDB()
        const { id, name, description, order, isActive } = await request.json()

        if (!id) {
            return NextResponse.json({ message: "ID is required" }, { status: 400 })
        }

        const updatedFloor = await Floor.findByIdAndUpdate(
            id,
            { name, description, order, isActive },
            { new: true }
        )

        if (!updatedFloor) {
            return NextResponse.json({ message: "Floor not found" }, { status: 404 })
        }

        return NextResponse.json(updatedFloor)
    } catch (error: any) {
        return NextResponse.json({ message: error.message || "Failed to update floor" }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        if (!(await verifyAdmin(request))) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        if (!id) return NextResponse.json({ message: "ID is required" }, { status: 400 })

        await connectDB()

        // Unassign tables associated with this floor
        await Table.updateMany({ floorId: id }, { $unset: { floorId: "" } })

        await Floor.findByIdAndDelete(id)
        return NextResponse.json({ message: "Floor deleted" })
    } catch (error: any) {
        return NextResponse.json({ message: "Failed to delete floor" }, { status: 500 })
    }
}
