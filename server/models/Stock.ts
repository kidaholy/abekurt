import mongoose, { Schema, Document } from "mongoose"

export interface IStock extends Document {
    name: string
    category: string
    quantity: number
    unit: string
    minLimit: number
    unitCost: number
    createdAt: Date
    updatedAt: Date
}

const StockSchema = new Schema<IStock>(
    {
        name: { type: String, required: true, trim: true },
        category: { type: String, required: true },
        quantity: { type: Number, default: 0 },
        unit: { type: String, required: true }, // e.g., 'kg', 'ltr', 'pcs'
        minLimit: { type: Number, default: 5 }, // Threshold for low stock warning
        unitCost: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    }
)

export default mongoose.model<IStock>("Stock", StockSchema)
