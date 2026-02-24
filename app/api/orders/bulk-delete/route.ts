import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Order from "@/lib/models/order"
import { addNotification } from "@/lib/notifications"
import { validateSession } from "@/lib/auth"

export async function DELETE(request: Request) {
  try {
    console.log("🗑️ Bulk deleting all orders...")

    const decoded = await validateSession(request)

    // Only admins can bulk delete orders
    if (decoded.role !== "admin") {
      return NextResponse.json({ message: "Forbidden - Admin access required" }, { status: 403 })
    }

    await connectDB()

    // Get count before deletion for notification
    const orderCount = await Order.countDocuments()

    if (orderCount === 0) {
      return NextResponse.json({ message: "No orders to delete" }, { status: 400 })
    }

    // Delete all orders
    const result = await Order.deleteMany({})

    // Send notification about bulk deletion
    try {
      addNotification(
        "warning",
        `🗑️ All orders (${orderCount} total) have been deleted by admin`,
        "admin"
      )
      console.log(`Bulk deletion notification sent: ${orderCount} orders deleted`)
    } catch (error) {
      console.error("Failed to send bulk deletion notification:", error)
    }

    console.log(`✅ Bulk deletion completed: ${result.deletedCount} orders deleted`)
    return NextResponse.json({
      message: `Successfully deleted ${result.deletedCount} orders`,
      deletedCount: result.deletedCount
    })
  } catch (error: any) {
    console.error("Bulk delete orders error:", error)
    return NextResponse.json({ message: error.message || "Failed to delete orders" }, { status: 500 })
  }
}