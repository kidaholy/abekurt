import { NextResponse } from "next/server"
import { signToken } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { connectDB } from "@/lib/db"
import User from "@/lib/models/user"
import Batch from "@/lib/models/batch"

export async function POST(request: Request) {
  try {
    await connectDB()

    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ message: "Invalid JSON" }, { status: 400 })
    }

    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password required" }, { status: 400 })
    }

    // Find user
    const user = await User.findOne({ email }).lean()

    if (!user) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 })
    }

    // Check if user is active
    if (user.isActive === false) {
      return NextResponse.json({ message: "Account deactivated. Please contact administrator." }, { status: 403 })
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 })
    }

    // Lookup batch number if user has a batch assignment
    let batchNumber = ""
    if (user.batchId) {
      const batch = await Batch.findById(user.batchId).lean()
      if (batch) batchNumber = batch.batchNumber
    }

    // Generate token
    const token = signToken({
      id: user._id,
      email: user.email,
      role: user.role,
      batchId: user.batchId
    })

    return NextResponse.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        batchId: user.batchId,
        batchNumber,
      },
    })
  } catch (error: any) {
    console.error("Login error:", error)
    return NextResponse.json({ message: error.message || "Login failed" }, { status: 500 })
  }
}
