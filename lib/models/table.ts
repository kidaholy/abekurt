import mongoose, { Schema, Document } from "mongoose"

interface ITable extends Document {
    tableNumber: string
    name?: string
    status: "active" | "inactive" | "maintenance"
    capacity?: number
    createdAt: Date
    updatedAt: Date
}

const tableSchema = new Schema<ITable>(
    {
        tableNumber: { type: String, required: true, unique: true },
        name: { type: String },
        status: {
            type: String,
            enum: ["active", "inactive", "maintenance"],
            default: "active",
        },
        capacity: { type: Number },
    },
    { timestamps: true }
)

// Force delete to avoid schema caching issues in Next.js Dev Mode
if (mongoose.models.Table) {
    delete mongoose.models.Table
}
const Table = mongoose.model<ITable>("Table", tableSchema)

export default Table
