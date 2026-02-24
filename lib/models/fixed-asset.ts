import mongoose, { Schema, Document } from "mongoose"

export interface IDismissalEntry {
    date: Date
    quantity: number
    reason: string
    valueLost: number
    dismissedBy?: mongoose.Types.ObjectId
}

export interface IFixedAsset extends Document {
    name: string
    category: string
    quantity: number
    unitPrice: number
    totalValue: number
    totalInvested: number
    purchaseDate: Date
    status: 'active' | 'partially_dismissed' | 'fully_dismissed'
    notes?: string
    dismissals: IDismissalEntry[]
    createdAt: Date
    updatedAt: Date
}

const DismissalEntrySchema = new Schema<IDismissalEntry>({
    date: { type: Date, default: Date.now },
    quantity: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true },
    valueLost: { type: Number, required: true, min: 0 },
    dismissedBy: { type: Schema.Types.ObjectId, ref: "User" }
})

const FixedAssetSchema = new Schema<IFixedAsset>(
    {
        name: { type: String, required: true, trim: true },
        category: { type: String, required: true, default: "General" },
        quantity: { type: Number, required: true, default: 1, min: 0 },
        unitPrice: { type: Number, required: true, default: 0, min: 0 },
        totalValue: { type: Number, required: true, default: 0, min: 0 },
        totalInvested: { type: Number, required: true, default: 0, min: 0 },
        purchaseDate: { type: Date, default: Date.now },
        status: {
            type: String,
            enum: ['active', 'partially_dismissed', 'fully_dismissed'],
            default: 'active'
        },
        notes: { type: String },
        dismissals: [DismissalEntrySchema]
    },
    {
        timestamps: true
    }
)

// Auto-update status based on quantity
FixedAssetSchema.pre('save', function () {
    if (this.quantity <= 0) {
        this.status = 'fully_dismissed'
        this.quantity = 0
        this.totalValue = 0
    } else if (this.dismissals && this.dismissals.length > 0) {
        this.status = 'partially_dismissed'
    } else {
        this.status = 'active'
    }
})

FixedAssetSchema.index({ status: 1 })
FixedAssetSchema.index({ category: 1 })

const FixedAsset = mongoose.models.FixedAsset || mongoose.model<IFixedAsset>("FixedAsset", FixedAssetSchema)

export default FixedAsset
