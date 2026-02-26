import mongoose, { Schema } from "mongoose"

interface IUser {
  name: string
  email: string
  password: string
  plainPassword?: string
  role: "admin" | "cashier" | "chef" | "display" | "store_keeper"
  isActive: boolean
  batchId?: mongoose.Types.ObjectId | string
  assignedCategories?: string[]
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    plainPassword: { type: String },
    role: { type: String, enum: ["admin", "cashier", "chef", "display", "store_keeper"], default: "cashier" },
    isActive: { type: Boolean, default: true },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch" },
    assignedCategories: [{ type: String }],
  },
  { timestamps: true },
)

// Force model re-registration to clear any ghost schemas
if (mongoose.models.User) {
  delete mongoose.models.User
}
const User = mongoose.model<IUser>("User", userSchema)

export default User
