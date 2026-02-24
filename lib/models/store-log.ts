import mongoose, { Schema, Document } from "mongoose"

export interface IStoreLog extends Document {
    stockId: mongoose.Types.ObjectId
    type: 'PURCHASE' | 'TRANSFER_OUT' | 'ADJUSTMENT'
    quantity: number
    unit: string
    pricePerUnit?: number
    totalPrice?: number
    user: mongoose.Types.ObjectId
    notes?: string
    date: Date
}

const StoreLogSchema = new Schema<IStoreLog>(
    {
        stockId: { type: Schema.Types.ObjectId, ref: "Stock", required: true },
        type: {
            type: String,
            required: true,
            enum: ['PURCHASE', 'TRANSFER_OUT', 'ADJUSTMENT']
        },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true },
        pricePerUnit: { type: Number },
        totalPrice: { type: Number },
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        notes: { type: String },
        date: { type: Date, default: Date.now }
    },
    {
        timestamps: true,
    }
)

// Index for reporting
StoreLogSchema.index({ date: -1, type: 1 })
StoreLogSchema.index({ stockId: 1 })

const StoreLog = mongoose.models.StoreLog || mongoose.model<IStoreLog>("StoreLog", StoreLogSchema)

export default StoreLog
