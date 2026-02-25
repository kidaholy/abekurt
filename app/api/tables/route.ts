import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Table from "@/lib/models/table"
import { validateSession } from "@/lib/auth"

export async function GET(request: Request) {
    try {
        await validateSession(request)
        await connectDB()
        const tables = await Table.find({ status: "active" }).lean()
        // Sort manually to avoid Mongoose-Next.js typing issues if they persist
        tables.sort((a: any, b: any) => String(a.tableNumber).localeCompare(String(b.tableNumber), undefined, { numeric: true }))
        // Return only necessary fields
        const serializedTables = tables.map(t => ({
            _id: t._id,
            tableNumber: t.tableNumber,
            capacity: t.capacity
        }))
        return NextResponse.json(serializedTables)
    } catch (error: any) {
        console.error("Failed to fetch tables:", error)
        return NextResponse.json({ message: "Failed to fetch tables" }, { status: 500 })
    }
}
