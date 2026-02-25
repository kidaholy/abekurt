import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Table from "@/lib/models/table"
import { validateSession } from "@/lib/auth"

export async function GET(request: Request) {
    try {
        await connectDB()
        const tables = await Table.find({}).sort({ tableNumber: 1 })
        return NextResponse.json(tables)
    } catch (error: any) {
        return NextResponse.json({ message: "Failed to fetch tables" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()
        const { tableNumber, name, capacity } = await request.json()

        if (!tableNumber) {
            return NextResponse.json({ message: "Table Number is required" }, { status: 400 })
        }

        const existing = await Table.findOne({ tableNumber })
        if (existing) {
            return NextResponse.json({ message: "Table Number already exists" }, { status: 400 })
        }

        const table = await Table.create({ tableNumber, name, capacity, status: "active" })
        return NextResponse.json(table, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ message: error.message || "Failed to create table" }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()
        const { id, tableNumber, name, capacity } = await request.json()

        if (!id || !tableNumber) {
            return NextResponse.json({ message: "ID and Table Number are required" }, { status: 400 })
        }

        // Check if new table number exists globally (excluding current table)
        const existing = await Table.findOne({ tableNumber, _id: { $ne: id } })
        if (existing) {
            return NextResponse.json({ message: "Table Number already exists" }, { status: 400 })
        }

        const updatedTable = await Table.findByIdAndUpdate(
            id,
            { tableNumber, name, capacity },
            { new: true }
        )

        if (!updatedTable) {
            return NextResponse.json({ message: "Table not found" }, { status: 404 })
        }

        return NextResponse.json(updatedTable)
    } catch (error: any) {
        return NextResponse.json({ message: error.message || "Failed to update table" }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        if (!id) return NextResponse.json({ message: "ID is required" }, { status: 400 })

        await connectDB()
        await Table.findByIdAndDelete(id)
        return NextResponse.json({ message: "Table deleted" })
    } catch (error: any) {
        return NextResponse.json({ message: "Failed to delete table" }, { status: 500 })
    }
}
