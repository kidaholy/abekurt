import { NextResponse } from "next/server"
import mongoose from "mongoose"
import { connectDB } from "@/lib/db"
import User from "@/lib/models/user"
import MenuItem from "@/lib/models/menu-item"
import Order from "@/lib/models/order"
import Batch from "@/lib/models/batch"
import Category from "@/lib/models/category"
import { validateSession } from "@/lib/auth"

export async function GET(request: Request) {
  const checks = {
    database: { status: "unknown", details: "" },
    collections: { status: "unknown", details: {} },
    auth: { status: "unknown", details: "" },
    environment: { status: "unknown", details: {} },
    debug_data: { status: "unknown", details: {} }
  }

  try {
    // Check database connection and run one-time migrations
    try {
      await connectDB()
      checks.database.status = "✅ Connected"
      checks.database.details = "MongoDB Atlas connection successful"

      // 🛠️ MIGRATION: Normalize all categories in the system
      console.log("🛠️ Starting category normalization migration...")
      const cats = await Category.find({})
      for (const cat of cats) {
        const normalized = cat.name.trim().normalize("NFC")
        if (cat.name !== normalized) {
          cat.name = normalized
          await cat.save()
        }
      }

      const users = await User.find({ role: "chef" })
      for (const user of users) {
        if (user.assignedCategories && user.assignedCategories.length > 0) {
          const normalized = user.assignedCategories.map((c: string) => c.trim().normalize("NFC"))
          if (JSON.stringify(user.assignedCategories) !== JSON.stringify(normalized)) {
            user.assignedCategories = normalized
            await user.save()
          }
        }
      }

      const menuItems = await MenuItem.find({})
      const menuMap = new Map()
      for (const item of menuItems) {
        const normalized = item.category.trim().normalize("NFC")
        menuMap.set(item._id.toString(), { category: normalized, name: item.name })
        if (item.category !== normalized) {
          item.category = normalized
          await item.save()
        }
      }

      const ordersToFix = await Order.find({ status: { $in: ["pending", "preparing", "ready"] } })
      for (const order of ordersToFix) {
        let orderChanged = false
        for (const item of order.items) {
          const menuInfo = menuMap.get(item.menuItemId)
          if (menuInfo) {
            const normalized = menuInfo.category
            if (!item.category || item.category !== normalized) {
              item.category = normalized
              orderChanged = true
            }
          }
        }
        if (orderChanged) {
          await order.save()
        }
      }
      console.log("✅ Category normalization and Order backfill complete")

    } catch (error) {
      checks.database.status = "❌ Failed"
      checks.database.details = error instanceof Error ? error.message : "Unknown error"
    }

    // Check collections
    try {
      const userCount = await User.countDocuments()
      const menuItemCount = await MenuItem.countDocuments()

      checks.collections.status = "✅ Available"
      checks.collections.details = {
        users: userCount,
        menuItems: menuItemCount
      }
    } catch (error) {
      checks.collections.status = "❌ Failed"
      checks.collections.details = error instanceof Error ? error.message : "Unknown error"
    }

    // Check authentication
    let currentUser = null
    try {
      const decoded = await validateSession(request)
      checks.auth.status = "✅ Valid"
      checks.auth.details = `User: ${decoded.email || decoded.id} (${decoded.role})`

      // Fetch fresh user data to return to client
      if (decoded.id) {
        const rawUser = await User.findById(decoded.id).select("-password").populate("batchId").lean() as any
        if (rawUser && rawUser.batchId && typeof rawUser.batchId === 'object') {
          currentUser = { ...rawUser, batchNumber: rawUser.batchId.batchNumber, batchId: rawUser.batchId._id }
        } else {
          currentUser = rawUser
        }
      }
    } catch (error: any) {
      if (error.message.includes("No token supported")) {
        checks.auth.status = "⚠️ No Token"
        checks.auth.details = "No authorization header provided"
      } else {
        checks.auth.status = "❌ Invalid/Deactivated"
        checks.auth.details = error.message
      }
    }

    // Check environment
    checks.environment.status = "✅ Loaded"
    checks.environment.details = {
      nodeEnv: process.env.NODE_ENV || "development",
      mongoUri: process.env.MONGODB_URI ? "Set" : "Missing",
      jwtSecret: process.env.JWT_SECRET ? "Set" : "Missing"
    }

    // Add debug data
    try {
      const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).lean()
      const sampleMenuItems = await MenuItem.find().limit(5).lean()
      const allCategories = await Category.find().lean()

      checks.debug_data.status = "✅ Collected"
      checks.debug_data.details = {
        recent_orders: recentOrders.map((o: any) => ({
          num: o.orderNumber,
          items: o.items.map((i: any) => ({ name: i.name, cat: i.category })),
          status: o.status
        })),
        menu_samples: sampleMenuItems.map((m: any) => ({ name: m.name, cat: m.category })),
        all_categories: allCategories.map((c: any) => c.name)
      }
    } catch (err) {
      checks.debug_data.status = "❌ Failed"
      checks.debug_data.details = err instanceof Error ? err.message : "Unknown error"
    }

    const authFailed = checks.auth.status.includes("❌ Invalid/Deactivated")
    const isUnauthorized = checks.auth.details.includes("Unauthorized")

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      overall: Object.values(checks).every(check => check.status.includes("✅")) ? "✅ Healthy" : "⚠️ Issues Found",
      checks,
      user: currentUser // Return fresh user data
    }, { status: (authFailed && isUnauthorized) ? 401 : 200 })

  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      overall: "❌ Critical Error",
      error: error instanceof Error ? error.message : "Unknown error",
      checks
    }, { status: 500 })
  }
}