import mongoose, { Schema } from "mongoose"

interface IOrderItem {
  menuItemId: string
  name: string
  quantity: number
  price: number
  specialInstructions: string
  status: "pending" | "preparing" | "ready" | "served"
}

interface IOrder {
  orderNumber: string
  items: IOrderItem[]
  totalAmount: number
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled"
  paymentStatus: "pending" | "paid" | "refunded"
  paymentMethod: string
  cashierId: string
  chefId?: string
  tableNumber?: string
  notes: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, unique: true, required: true },
    items: [
      {
        menuItemId: String,
        name: String,
        quantity: Number,
        price: Number,
        specialInstructions: String,
        status: { type: String, enum: ["pending", "preparing", "ready", "served"], default: "pending" },
      },
    ],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "preparing", "ready", "completed", "cancelled"], default: "pending" },
    paymentStatus: { type: String, enum: ["pending", "paid", "refunded"], default: "pending" },
    paymentMethod: String,
    cashierId: String,
    chefId: String,
    tableNumber: String,
    notes: String,
    completedAt: Date,
  },
  { timestamps: true },
)

export default mongoose.model<IOrder>("Order", orderSchema)
