import mongoose, { Schema, Document } from "mongoose"

export interface IFloor extends Document {
    name: string
    description?: string
    order: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

const FloorSchema = new Schema<IFloor>(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String },
        order: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
)


const Floor = mongoose.models.Floor || mongoose.model<IFloor>("Floor", FloorSchema)

export default Floor
