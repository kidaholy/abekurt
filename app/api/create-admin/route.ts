import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { connectDB } from "@/lib/db"
import User from "@/lib/models/user"

export async function GET() {
  try {
    await connectDB()

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: "kidayos2014@gmail.com" })
    if (existingAdmin) {
      return NextResponse.json({ 
        message: "Admin user already exists",
        email: "kidayos2014@gmail.com"
      })
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10)
    
    const adminUser = new User({
      name: "Admin User",
      email: "kidayos2014@gmail.com",
      password: hashedPassword,
      role: "admin",
      isActive: true
    })

    await adminUser.save()

    // Also create cashier and chef users
    const cashierPassword = await bcrypt.hash("cashier123", 10)
    const chefPassword = await bcrypt.hash("chef123", 10)

    const cashierUser = new User({
      name: "Cashier User",
      email: "cashier@primeaddis.com",
      password: cashierPassword,
      role: "cashier",
      isActive: true
    })

    const chefUser = new User({
      name: "Chef User", 
      email: "chef@primeaddis.com",
      password: chefPassword,
      role: "chef",
      isActive: true
    })

    await cashierUser.save()
    await chefUser.save()

    return NextResponse.json({
      message: "Admin users created successfully!",
      users: [
        { email: "kidayos2014@gmail.com", password: "admin123", role: "admin" },
        { email: "cashier@primeaddis.com", password: "cashier123", role: "cashier" },
        { email: "chef@primeaddis.com", password: "chef123", role: "chef" }
      ]
    })

  } catch (error: any) {
    console.error("Error creating admin:", error)
    return NextResponse.json(
      { error: "Failed to create admin user", details: error.message },
      { status: 500 }
    )
  }
}