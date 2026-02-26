import mongoose, { Schema, Document } from "mongoose"

export interface ITransferRequest extends Document {
    stockId: mongoose.Types.ObjectId
    quantity: number
    status: 'pending' | 'approved' | 'denied'
    requestedBy: mongoose.Types.ObjectId
    handledBy?: mongoose.Types.ObjectId
    denialReason?: string
    notes?: string
    createdAt: Date
    updatedAt: Date
}

const TransferRequestSchema = new Schema<ITransferRequest>(
    {
        stockId: { type: Schema.Types.ObjectId, ref: "Stock", required: true },
        quantity: { type: Number, required: true, min: 0.001 },
        status: {
            type: String,
            enum: ['pending', 'approved', 'denied'],
            default: 'pending'
        },
        requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        handledBy: { type: Schema.Types.ObjectId, ref: "User" },
        denialReason: { type: String },
        notes: { type: String },
    },
    {
        timestamps: true,
    }
)

// Index for performance
TransferRequestSchema.index({ status: 1, createdAt: -1 })
TransferRequestSchema.index({ requestedBy: 1 })

const TransferRequest = mongoose.models.TransferRequest || mongoose.model<ITransferRequest>("TransferRequest", TransferRequestSchema)

export default TransferRequest
