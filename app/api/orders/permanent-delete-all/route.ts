import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Order from "@/lib/models/order"
import { addNotification } from "@/lib/notifications"
import { validateSession } from "@/lib/auth"

// Permanently delete all soft-deleted orders from the database
export async function DELETE(request: Request) {
  try {
    const decoded = await validateSession(request)

    if (decoded.role !== "admin") {
      return NextResponse.json({ message: "Forbidden - Admin access required" }, { status: 403 })
    }

    await connectDB()

    // Count how many soft-deleted orders exist
    const deletedCount = await Order.countDocuments({ isDeleted: true })

    if (deletedCount === 0) {
      return NextResponse.json({ message: "No deleted orders to permanently remove", deletedCount: 0 }, { status: 400 })
    }

    // Permanently remove all soft-deleted orders
    await Order.deleteMany({ isDeleted: true })

    addNotification(
      "warning",
      `🗑️ ${deletedCount} deleted order(s) have been permanently removed by admin.`,
      "admin"
    )

    console.log(`✅ Permanent deletion completed: ${deletedCount} orders removed from DB`)
    return NextResponse.json({
      message: `Successfully permanently deleted ${deletedCount} orders`,
      deletedCount,
    })
  } catch (error: any) {
    console.error("Permanent delete all orders error:", error)
    return NextResponse.json({ message: error.message || "Failed to permanently delete orders" }, { status: 500 })
  }
}
