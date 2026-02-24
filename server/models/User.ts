import mongoose, { Schema } from "mongoose"
import bcrypt from "bcryptjs"

interface IUser {
  name: string
  email: string
  password: string
  role: "admin" | "cashier" | "chef"
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  comparePassword(password: string): Promise<boolean>
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "cashier", "chef"], default: "cashier" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

userSchema.methods.comparePassword = async function (password: string) {
  return await bcrypt.compare(password, this.password)
}

// Prevent model recompilation in Next.js hot reload
const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema)

export default User
