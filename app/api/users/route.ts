import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { connectDB } from "@/lib/db"
import User from "@/lib/models/user"
import { validateSession } from "@/lib/auth"

// Get all users (admin only)
export async function GET(request: Request) {
  try {
    const decoded = await validateSession(request)
    console.log("📋 Admin fetching users:", decoded.email || decoded.id)

    if (decoded.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    console.log("📊 Database connected for user retrieval")

    const users = await User.find({}).select("-password").lean()
    console.log(`Found ${users.length} users in database`)

    // Convert ObjectId to string for frontend compatibility
    const serializedUsers = users.map(user => ({
      ...user,
      _id: user._id.toString()
    }))

    return NextResponse.json(serializedUsers)
  } catch (error: any) {
    console.error("❌ Get users error:", error)
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: error.message || "Failed to get users" }, { status })
  }
}

// Create new user (admin only)
export async function POST(request: Request) {
  try {
    const decoded = await validateSession(request)
    console.log("🔐 Admin creating user:", decoded.email || decoded.id)

    if (decoded.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    console.log("📊 Database connected for user creation")

    const { name, email, role, password, batchId, assignedCategories } = await request.json()
    console.log("📝 User data received:", { name, email, role, passwordLength: password?.length, assignedCategories })

    if (!name || !email || !role || !password) {
      return NextResponse.json({ message: "All fields required" }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      console.log("❌ User already exists:", email)
      return NextResponse.json({ message: "User already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    console.log("🔒 Password hashed successfully")

    // Create user data
    const userData = {
      name,
      email,
      password: hashedPassword,
      plainPassword: password, // Store plain password for admin view
      role,
      isActive: true,
      batchId: batchId || undefined,
      assignedCategories: (role === 'chef' && assignedCategories) ? assignedCategories : undefined,
    }

    console.log("💾 Creating user in database:", { ...userData, password: "[HIDDEN]" })

    // Create user
    const user = await User.create(userData)
    console.log("✅ User created successfully:", user._id)

    return NextResponse.json({
      message: "User created successfully",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        batchId: user.batchId,
      },
      credentials: {
        email,
        password, // Return plain password for admin to share
      },
    })
  } catch (error: any) {
    console.error("❌ Create user error:", error)
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: error.message || "Failed to create user" }, { status })
  }
}
