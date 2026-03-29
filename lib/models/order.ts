import mongoose, { Schema, Document } from "mongoose"

interface IOrderItem {
  menuItemId: string
  menuId?: string
  name: string
  quantity: number
  price: number
  status: "pending" | "cooking" | "served" | "completed" | "cancelled"
  modifiers?: string[]
  notes?: string
  category?: string
  mainCategory?: 'Food' | 'Drinks'
  initialStatus?: string
  preparationTime?: number
}

interface IOrder extends Document {
  orderNumber: string
  items: IOrderItem[]
  totalAmount: number
  tax?: number
  subtotal?: number
  status: "pending" | "cooking" | "served" | "completed" | "cancelled"
  paymentMethod: string
  customerName?: string
  tableNumber: string
  tableId?: mongoose.Types.ObjectId | string
  batchId?: mongoose.Types.ObjectId | string
  batchNumber?: string
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
  kitchenAcceptedAt?: Date
  readyAt?: Date
  servedAt?: Date
  delayMinutes?: number
  thresholdMinutes?: number
  totalPreparationTime?: number
  isDeleted?: boolean
}

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    items: [
      {
        menuItemId: { type: String, required: true },
        menuId: { type: String },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        status: {
          type: String,
          enum: ["pending", "cooking", "served", "completed", "cancelled"],
          default: "pending"
        },
        modifiers: [{ type: String }],
        notes: { type: String },
        category: { type: String },
        mainCategory: { type: String, enum: ['Food', 'Drinks'] },
        initialStatus: { type: String },
        preparationTime: { type: Number }
      },
    ],
    totalAmount: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "cooking", "served", "completed", "cancelled"],
      default: "pending",
    },
    paymentMethod: { type: String, default: "cash" },
    customerName: { type: String },
    tableNumber: { type: String, required: true, index: true },
    tableId: { type: Schema.Types.ObjectId, ref: "Table" },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch" },
    batchNumber: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    kitchenAcceptedAt: { type: Date },
    readyAt: { type: Date },
    servedAt: { type: Date },
    delayMinutes: { type: Number },
    thresholdMinutes: { type: Number },
    totalPreparationTime: { type: Number },
    isDeleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
)

// Performance Indexes
orderSchema.index({ status: 1, createdAt: -1 })
orderSchema.index({ batchId: 1 })
orderSchema.index({ "items.category": 1 })
orderSchema.index({ createdBy: 1 })
orderSchema.index({ createdAt: -1 })

const Order = mongoose.models.Order || mongoose.model<IOrder>("Order", orderSchema)

export default Order
