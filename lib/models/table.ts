import mongoose, { Schema, Document } from "mongoose"

interface ITable extends Document {
    tableNumber: string
    name?: string
    status: "active" | "inactive" | "maintenance"
    capacity?: number
    batchId?: mongoose.Types.ObjectId | string
    createdAt: Date
    updatedAt: Date
}

const tableSchema = new Schema<ITable>(
    {
        tableNumber: { type: String, required: true },
        name: { type: String },
        status: {
            type: String,
            enum: ["active", "inactive", "maintenance"],
            default: "active",
        },
        capacity: { type: Number },
        batchId: { type: Schema.Types.ObjectId, ref: "Batch" },
    },
    { timestamps: true }
)

// Allow same table number on different batches
tableSchema.index({ tableNumber: 1, batchId: 1 }, { unique: true })

const Table = mongoose.models.Table || mongoose.model<ITable>("Table", tableSchema)

export default Table
