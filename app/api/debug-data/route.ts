import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Batch from "@/lib/models/batch"
import Table from "@/lib/models/table"
import User from "@/lib/models/user"

export async function GET(request: Request) {
    try {
        await connectDB()

        const batches = await Batch.find({}).lean()
        const tables = await Table.find({}).lean()
        const users = await User.find({ role: "cashier" }).lean()

        return NextResponse.json({
            batches: batches.map(b => ({
                _id: b._id.toString(),
                batchNumber: b.batchNumber,
                isActive: b.isActive,
                idType: typeof b._id
            })),
            tables: tables.map(t => ({
                _id: t._id.toString(),
                tableNumber: t.tableNumber,
                batchId: t.batchId,
                batchIdType: typeof t.batchId,
                status: t.status
            })),
            cashiers: users.map(u => ({
                _id: u._id.toString(),
                name: u.name,
                email: u.email,
                batchId: u.batchId,
                batchIdType: typeof u.batchId
            }))
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
