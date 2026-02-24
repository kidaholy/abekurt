import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import mongoose from "mongoose"
import { connectDB } from "@/lib/db"
import User from "@/lib/models/user"
import { validateSession } from "@/lib/auth"

const MAIN_ADMIN_EMAIL = "kidayos2014@gmail.com"

// Get single user (admin only)
export async function GET(request: Request, context: any) {
  try {
    const params = await context.params

    const decoded = await validateSession(request)

    if (decoded.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()

    const user = await User.findById(params.id).select("-password").lean()

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    console.log("✅ User retrieved:", user.email)
    return NextResponse.json({
      ...user,
      _id: user._id.toString()
    })
  } catch (error: any) {
    console.error("❌ Get user error:", error)
    return NextResponse.json({ message: error.message || "Failed to get user" }, { status: 500 })
  }
}

// Update user (admin only)
export async function PUT(request: Request, context: any) {
  const params = await context.params
  console.log("🚀 PUT /api/users/[id] route hit!")
  console.log("📋 Params received:", JSON.stringify(params))
  console.log("📋 Params.id:", params?.id)
  console.log("📋 Params type:", typeof params)
  console.log("🔗 Request URL:", request.url)

  try {
    const decoded = await validateSession(request)
    console.log("🔄 Admin updating user:", decoded.email || decoded.id)

    if (decoded.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    console.log("📊 Database connected for user update")

    let requestBody
    try {
      requestBody = await request.json()
      console.log("📝 Raw request body:", requestBody)
    } catch (jsonError: any) {
      console.log("❌ Invalid JSON in request body:", jsonError.message)
      return NextResponse.json({ message: "Invalid JSON in request body" }, { status: 400 })
    }

    const { name, email, role, password, isActive, floorId, assignedCategories } = requestBody
    console.log("📝 Update data received:", { name, email, role, isActive, hasPassword: !!password, assignedCategories })
    console.log("🔍 Looking for user with ID:", params?.id)

    // Validate required fields
    if (!name || !email) {
      console.log("❌ Missing required fields:", { name: !!name, email: !!email })
      return NextResponse.json({ message: "Name and email are required" }, { status: 400 })
    }

    // Validate role
    if (role && !['admin', 'cashier', 'chef', 'display'].includes(role)) {
      console.log("❌ Invalid role:", role)
      return NextResponse.json({ message: "Invalid role. Must be admin, cashier, chef, or display" }, { status: 400 })
    }

    // Extract user ID from URL as fallback
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const userIdFromUrl = pathSegments[pathSegments.length - 1]
    console.log("🔗 URL path segments:", pathSegments)
    console.log("🆔 User ID from URL:", userIdFromUrl)

    // Use params.id if available, otherwise use URL extraction
    const userId = params?.id || userIdFromUrl
    console.log("🎯 Final user ID to use:", userId)

    // Validate ObjectId format - Check if we have a user ID
    if (!userId) {
      console.log("❌ No user ID provided in params or URL")
      return NextResponse.json({ message: "No user ID provided" }, { status: 400 })
    }

    if (userId.length !== 24) {
      console.log("❌ Invalid user ID format:", userId, "Length:", userId.length)
      return NextResponse.json({ message: `Invalid user ID format. Expected 24 characters, got ${userId.length}` }, { status: 400 })
    }

    // Validate ObjectId hex format
    if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
      console.log("❌ Invalid ObjectId hex format:", userId)
      return NextResponse.json({ message: "Invalid ObjectId hex format" }, { status: 400 })
    }

    // Check if user exists
    let existingUser
    try {
      existingUser = await User.findById(userId)
      console.log("🔍 User lookup result:", existingUser ? "Found" : "Not found")
    } catch (mongoError: any) {
      console.log("❌ MongoDB lookup error:", mongoError.message)
      return NextResponse.json({ message: `Database lookup error: ${mongoError.message}` }, { status: 400 })
    }

    if (!existingUser) {
      // Let's also try to find all users to debug
      const allUsers = await User.find({}).select("_id name email").lean()
      console.log("📋 All users in database:", allUsers.map(u => ({ id: u._id.toString(), email: u.email })))
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Prevent admin from updating their own role or deactivating themselves
    if (existingUser._id.toString() === decoded.id && (role !== existingUser.role || isActive === false)) {
      return NextResponse.json({ message: "Cannot modify your own role or deactivate yourself" }, { status: 400 })
    }

    // Protection for Main Admin (Root User)
    if (existingUser.email === MAIN_ADMIN_EMAIL) {
      // 1. Only the main admin can modify their own account
      if (decoded.email !== MAIN_ADMIN_EMAIL) {
        return NextResponse.json({ message: "Forbidden: Only the main administrator can modify this account" }, { status: 403 })
      }

      // 2. Main admin cannot change their own role or isActive status to prevent accidental lockout
      if (role && role !== "admin") {
        return NextResponse.json({ message: "Cannot demote the root administrator" }, { status: 400 })
      }
      if (isActive === false) {
        return NextResponse.json({ message: "Cannot deactivate the root administrator" }, { status: 400 })
      }
    }

    // Check if email is already taken by another user
    if (email && email !== existingUser.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: userId } })
      if (emailExists) {
        return NextResponse.json({ message: "Email already exists" }, { status: 400 })
      }
    }

    // Prepare update data
    const updateData: any = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (role) updateData.role = role
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (floorId !== undefined) updateData.floorId = floorId || null
    if (assignedCategories !== undefined) updateData.assignedCategories = assignedCategories

    // Hash new password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
      updateData.plainPassword = password // Store plain password for admin view
      console.log("🔒 New password hashed and plainPassword updated")
    }

    console.log("💾 Updating user in database:", { ...updateData, password: password ? "[HIDDEN]" : undefined })
    console.log("🎯 Updating user with ID:", userId)
    console.log("📊 Update data keys:", Object.keys(updateData))

    // Update user
    let updatedUser
    try {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      ).select("-password")

      console.log("✅ MongoDB update operation completed")
      console.log("📄 Updated user result:", updatedUser ? "Success" : "No user returned")

      if (updatedUser) {
        console.log("👤 Updated user details:", {
          id: updatedUser._id.toString(),
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          isActive: updatedUser.isActive
        })
      }
    } catch (updateError: any) {
      console.error("❌ MongoDB update error:", updateError)
      return NextResponse.json({ message: `Database update error: ${updateError.message}` }, { status: 500 })
    }

    if (!updatedUser) {
      console.log("❌ User update returned null - user may not exist")
      return NextResponse.json({ message: "User not found or update failed" }, { status: 404 })
    }

    console.log("✅ User updated successfully:", updatedUser.email)

    // Verify the update by re-fetching the user
    try {
      const verificationUser = await User.findById(userId).select("-password").lean()
      console.log("🔍 Verification fetch result:", verificationUser ? "Found" : "Not found")

      if (verificationUser) {
        console.log("✅ Verification - User data in database:", {
          id: verificationUser._id.toString(),
          name: verificationUser.name,
          email: verificationUser.email,
          role: verificationUser.role,
          isActive: verificationUser.isActive
        })

        // Check if the changes were actually saved
        const changesVerified = {
          nameChanged: name ? verificationUser.name === name : true,
          emailChanged: email ? verificationUser.email === email : true,
          roleChanged: role ? verificationUser.role === role : true,
          statusChanged: typeof isActive === 'boolean' ? verificationUser.isActive === isActive : true
        }
        console.log("🔍 Changes verification:", changesVerified)
      }
    } catch (verifyError: any) {
      console.error("❌ Verification fetch error:", verifyError)
    }

    return NextResponse.json({
      message: "User updated successfully",
      user: updatedUser,
    })
  } catch (error: any) {
    console.error("❌ Update user error:", error)
    return NextResponse.json({ message: error.message || "Failed to update user" }, { status: 500 })
  }
}

// Delete user (admin only)
export async function DELETE(request: Request, context: any) {
  try {
    const params = await context.params
    console.log("🗑️ DELETE request received for user deletion")
    console.log("🆔 User ID to delete:", params.id)

    const decoded = await validateSession(request)
    console.log("🗑️ Admin deleting user:", decoded.email || decoded.id)

    if (decoded.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    console.log("📊 Database connected for user deletion")

    // Validate ObjectId format using mongoose
    if (!params.id || !/^[0-9a-fA-F]{24}$/.test(params.id)) {
      console.error("❌ Invalid ObjectId format for deletion:", params.id)
      return NextResponse.json({ message: "Invalid user ID format" }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await User.findById(params.id)
    console.log("🔍 User found for deletion:", existingUser ? "Yes" : "No")

    if (!existingUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Prevent admin from deleting themselves
    if (existingUser._id.toString() === decoded.id) {
      return NextResponse.json({ message: "Cannot delete yourself" }, { status: 400 })
    }

    // Prevent deleting the main admin
    if (existingUser.email === MAIN_ADMIN_EMAIL) {
      return NextResponse.json({ message: "Forbidden: The main administrator account is untouchable and cannot be deleted" }, { status: 403 })
    }

    // Prevent deleting the last admin
    if (existingUser.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" })
      if (adminCount <= 1) {
        return NextResponse.json({ message: "Cannot delete the last admin user" }, { status: 400 })
      }
    }

    console.log("💾 Deleting user from database:", existingUser.email)

    // Delete user
    await User.findByIdAndDelete(params.id)

    console.log("✅ User deleted successfully:", existingUser.email)

    return NextResponse.json({
      message: "User deleted successfully",
      deletedUser: {
        id: existingUser._id.toString(),
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
      },
    })
  } catch (error: any) {
    console.error("❌ Delete user error:", error)
    return NextResponse.json({ message: error.message || "Failed to delete user" }, { status: 500 })
  }
}