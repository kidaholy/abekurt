import mongoose, { Schema } from "mongoose"

interface IUser {
  name: string
  email: string
  password: string
  plainPassword?: string
  role: "admin" | "cashier" | "chef" | "display"
  isActive: boolean
  floorId?: mongoose.Types.ObjectId | string
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
    role: { type: String, enum: ["admin", "cashier", "chef", "display"], default: "cashier" },
    isActive: { type: Boolean, default: true },
    floorId: { type: Schema.Types.ObjectId, ref: "Floor" },
    assignedCategories: [{ type: String }],
  },
  { timestamps: true },
)

const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema)

export default User
