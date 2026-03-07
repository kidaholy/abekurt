import mongoose, { Schema, Document, CallbackError } from "mongoose"

// Restock history entry
export interface IRestockEntry {
    date: Date
    quantityAdded: number
    totalPurchaseCost: number // Total cost paid for this restock batch
    unitCostAtTime: number // Selling price per unit at time of restock
    notes?: string
    restockedBy?: mongoose.Types.ObjectId
}

export interface IStock extends Document {
    name: string
    category: string
    quantity: number // Current remaining quantity
    unit: string // kg, L, pcs, g, ml
    unitType: 'weight' | 'volume' | 'count' // For validation and reporting
    minLimit: number // Threshold for low POS stock warning
    storeMinLimit: number // Threshold for low Store stock warning
    averagePurchasePrice: number // Average purchase price per unit (calculated)
    unitCost: number // Current selling price (what we charge)
    trackQuantity: boolean
    showStatus: boolean
    status: 'active' | 'finished' | 'out_of_stock'
    restockHistory: IRestockEntry[] // Track all restocking events
    storeQuantity: number // Current quantity in the store (not yet ready for sale)
    totalPurchased: number // Lifetime total purchased
    totalConsumed: number // Lifetime total consumed via sales
    totalInvestment: number // Total money invested in purchasing this item
    createdAt: Date
    updatedAt: Date
}

const RestockEntrySchema = new Schema<IRestockEntry>({
    date: { type: Date, default: Date.now },
    quantityAdded: { type: Number, required: true },
    totalPurchaseCost: { type: Number, required: true },
    unitCostAtTime: { type: Number, required: true },
    notes: { type: String },
    restockedBy: { type: Schema.Types.ObjectId, ref: "User" }
})

const StockSchema = new Schema<IStock>(
    {
        name: { type: String, required: true, trim: true },
        category: { type: String, required: true },
        quantity: { type: Number, required: true, default: 0, min: 0 }, // This is "In Stock" (POS available)
        storeQuantity: { type: Number, required: true, default: 0, min: 0 }, // This is "In Store" (Bulk)
        unit: { type: String, required: true }, // e.g., 'kg', 'g', 'L', 'ml', 'pcs'
        unitType: {
            type: String,
            required: true,
            enum: ['weight', 'volume', 'count'],
            default: 'count'
        },
        minLimit: { type: Number, required: true, default: 0, min: 0 },
        storeMinLimit: { type: Number, required: true, default: 0, min: 0 },
        averagePurchasePrice: { type: Number, required: true, default: 0, min: 0 },
        unitCost: { type: Number, required: true, default: 0, min: 0 },
        trackQuantity: { type: Boolean, default: true },
        showStatus: { type: Boolean, default: true },
        status: {
            type: String,
            enum: ['active', 'finished', 'out_of_stock'],
            default: 'active'
        },
        restockHistory: [RestockEntrySchema],
        totalPurchased: { type: Number, default: 0, min: 0 },
        totalConsumed: { type: Number, default: 0, min: 0 },
        totalInvestment: { type: Number, default: 0, min: 0 },
    },
    {
        timestamps: true,
    }
)

// Middleware to auto-update status based on quantity
StockSchema.pre('save', async function () {
    if (this.trackQuantity) {
        if (this.quantity <= 0) {
            this.status = 'out_of_stock'
        } else if (this.quantity <= this.minLimit) {
            // Keep as active but will show low stock warning
            if (this.status === 'out_of_stock') {
                this.status = 'active'
            }
        } else {
            if (this.status === 'out_of_stock') {
                this.status = 'active'
            }
        }
    }
})

// Helper method to check if item is available for ordering
StockSchema.methods.isAvailableForOrder = function (requiredQuantity: number = 1): boolean {
    if (!this.trackQuantity) return true
    return this.status === 'active' && this.quantity >= requiredQuantity
}

// Helper method to consume stock (deduct quantity)
StockSchema.methods.consumeStock = function (quantity: number): boolean {
    if (!this.trackQuantity) return true
    if (this.quantity >= quantity) {
        this.quantity -= quantity
        this.totalConsumed += quantity
        return true
    }
    return false
}

// Helper method to add to store (Purchase)
StockSchema.methods.addToStore = function (quantityAdded: number, totalPurchaseCost: number, newUnitCost: number, notes?: string, restockedBy?: mongoose.Types.ObjectId) {
    // Add to restock history
    this.restockHistory.push({
        date: new Date(),
        quantityAdded,
        totalPurchaseCost,
        unitCostAtTime: newUnitCost,
        notes,
        restockedBy
    })

    // Update current values - Add to STORE first
    this.storeQuantity += quantityAdded
    this.totalPurchased += quantityAdded
    this.totalInvestment += totalPurchaseCost

    // Calculate new average purchase price
    if (this.totalPurchased > 0) {
        this.averagePurchasePrice = this.totalInvestment / this.totalPurchased
    }

    this.unitCost = newUnitCost // Update to latest selling price
}

// Helper method to move from Store to Stock (Transfer)
StockSchema.methods.moveToStock = function (quantity: number) {
    if (this.storeQuantity >= quantity) {
        this.storeQuantity -= quantity
        this.quantity += quantity
        return true
    }
    return false
}

// Helper method to get total quantity (POS + Store)
StockSchema.methods.getTotalQuantity = function(): number {
    return (this.quantity || 0) + (this.storeQuantity || 0)
}

// Helper method to get total asset value (at average purchase price)
StockSchema.methods.getTotalAssetValue = function(): number {
    return this.getTotalQuantity() * (this.averagePurchasePrice || 0)
}

// Helper method to restock (Ddeprecated path, but keeping signature for now or updating it)
StockSchema.methods.restock = function (quantityAdded: number, totalPurchaseCost: number, newUnitCost: number, notes?: string, restockedBy?: mongoose.Types.ObjectId) {
    // For legacy support or direct restocking, we just use addToStore + moveToStock immediately or just keep it
    this.addToStore(quantityAdded, totalPurchaseCost, newUnitCost, notes, restockedBy)
}


const Stock = mongoose.models.Stock || mongoose.model<IStock>("Stock", StockSchema)

export default Stock
