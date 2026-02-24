import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Floor from "@/lib/models/floor"
import Table from "@/lib/models/table"
import User from "@/lib/models/user"

export async function GET(request: Request) {
    try {
        await connectDB()

        const floors = await Floor.find({}).lean()
        const tables = await Table.find({}).lean()
        const users = await User.find({ role: "cashier" }).lean()

        return NextResponse.json({
            floors: floors.map(f => ({
                _id: f._id.toString(),
                name: f.name,
                isActive: f.isActive,
                idType: typeof f._id
            })),
            tables: tables.map(t => ({
                _id: t._id.toString(),
                tableNumber: t.tableNumber,
                floorId: t.floorId,
                floorIdType: typeof t.floorId,
                status: t.status
            })),
            cashiers: users.map(u => ({
                _id: u._id.toString(),
                name: u.name,
                email: u.email,
                floorId: u.floorId,
                floorIdType: typeof u.floorId
            }))
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
