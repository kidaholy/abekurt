import { NextResponse } from "next/server"
import mongoose from "mongoose"
import { connectDB } from "@/lib/db"
import Order from "@/lib/models/order"
import User from "@/lib/models/user"
import { addNotification } from "@/lib/notifications"
import { calculateStockConsumption, applyStockAdjustment } from "@/lib/stock-logic"
import { validateSession } from "@/lib/auth"

export async function PUT(request: Request, context: any) {
  try {
    const params = await context.params
    console.log("🔄 Updating order status for ID:", params.id)

    await validateSession(request)
    await connectDB()

    const { status } = await request.json()
    console.log("📝 New status:", status)

    const orderToUpdate = await Order.findById(params.id)
    if (!orderToUpdate) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 })
    }

    const decoded = await validateSession(request)
    const previousStatus = orderToUpdate.status

    // RBAC: If role is chef, only update assigned items
    if (decoded.role === 'chef') {
      const user = await User.findById(decoded.id).lean() as any
      const assignedCategories = user?.assignedCategories || []

      // Update status of items in the order that belong to this chef's categories
      let allItemsReady = true
      let anyItemPreparing = false

      const normalizedAssigned = assignedCategories.map((c: string) => c.trim().normalize("NFC").toLowerCase())

      orderToUpdate.items.forEach((item: any) => {
        if (item.category && normalizedAssigned.includes(item.category.trim().normalize("NFC").toLowerCase())) {
          item.status = status
        }

        // Track overall progress
        // Items are considered "done" if they are ready, served, completed, or cancelled
        const isItemDone = ['ready', 'served', 'completed', 'cancelled'].includes(item.status)
        if (!isItemDone) {
          allItemsReady = false
        }
        if (item.status === 'preparing') {
          anyItemPreparing = true
        }
      })

      // Determine new overall status
      let newOverallStatus = orderToUpdate.status
      if (status === 'cancelled') {
        // ...
      } else {
        if (allItemsReady) {
          // If the chef requested "completed" and all items are indeed ready/completed, 
          // we allow the overall status to become "completed" or "ready".
          newOverallStatus = status === 'completed' ? 'completed' : 'ready'
        } else if (anyItemPreparing || status === 'preparing') {
          newOverallStatus = 'preparing'
        }
      }

      orderToUpdate.status = newOverallStatus
    } else {
      // Global update (admin/cashier)
      orderToUpdate.status = status
      // Also update all items to match global status if needed
      orderToUpdate.items.forEach((item: any) => {
        item.status = status
      })
    }

    // 🔗 BUSINESS LOGIC: Restore stock if order is cancelled
    if (status === "cancelled" && previousStatus !== "cancelled") {
      const stockConsumptionMap = await calculateStockConsumption(orderToUpdate.items)
      await applyStockAdjustment(stockConsumptionMap, 1) // 1 = Restore
      console.log(`📡 Restored stock for order #${orderToUpdate.orderNumber} via status toggle`)
    }

    const order = await orderToUpdate.save()

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 })
    }

    // Send notifications based on status change
    try {
      const statusMessages = {
        preparing: `👨‍🍳 Order #${order.orderNumber} is now being prepared`,
        ready: `🔔 Order #${order.orderNumber} is ready for pickup!`,
        completed: `✅ Order #${order.orderNumber} has been completed`,
        cancelled: `❌ Order #${order.orderNumber} has been cancelled by the kitchen`
      }

      const statusEmojis = {
        preparing: "👨‍🍳",
        ready: "🔔",
        completed: "✅",
        cancelled: "❌"
      }

      if (statusMessages[status as keyof typeof statusMessages]) {
        // Notify cashiers about ready orders and cancellations
        if (status === "ready" || status === "cancelled") {
          addNotification(
            status === "ready" ? "success" : "warning",
            statusMessages[status as keyof typeof statusMessages],
            "cashier"
          )
        }

        // Notify admin about all status changes
        addNotification(
          status === "cancelled" ? "warning" : "info",
          statusMessages[status as keyof typeof statusMessages],
          "admin"
        )

        console.log(`Order status update notification sent: ${order.orderNumber} -> ${status}`)
      }
    } catch (error) {
      console.error("Failed to send status update notifications:", error)
    }

    return NextResponse.json(order)
  } catch (error: any) {
    console.error("Update order status error:", error)
    return NextResponse.json({ message: error.message || "Failed to update order status" }, { status: 500 })
  }
}
