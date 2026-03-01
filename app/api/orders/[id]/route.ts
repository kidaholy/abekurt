import { NextResponse } from "next/server"
import mongoose from "mongoose"
import { connectDB } from "@/lib/db"
import Order from "@/lib/models/order"
import User from "@/lib/models/user"
import MenuItem from "@/lib/models/menu-item"
import Stock from "@/lib/models/stock"
import Settings from "@/lib/models/settings"
import { addNotification } from "@/lib/notifications"
import { calculateStockConsumption, applyStockAdjustment } from "@/lib/stock-logic"
import { validateSession } from "@/lib/auth"

// PUT update order status with automatic stock consumption
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await validateSession(request)
        await connectDB()

        const { id } = await params
        const body = await request.json()
        const { status } = body

        const order = await (Order as any).findById(id)
        if (!order) {
            return NextResponse.json({ message: "Order not found" }, { status: 404 })
        }

        const decoded = await validateSession(request)
        const previousStatus = order.status

        // RBAC: If role is chef, only update assigned items
        if (decoded.role === 'chef') {
            const user = await User.findById(decoded.id).lean() as any
            const assignedCategories = user?.assignedCategories || []

            const normalizedAssigned = assignedCategories.map((c: string) => c.trim().normalize("NFC").toLowerCase())

            // Update status of items in the order that belong to this chef's categories
            let allItemsReady = true
            let anyItemPreparing = false

            order.items.forEach((item: any) => {
                if (item.category && normalizedAssigned.includes(item.category.trim().normalize("NFC").toLowerCase())) {
                    item.status = status
                }

                // Track overall progress
                const isItemDone = ['ready', 'served', 'completed', 'cancelled'].includes(item.status)
                if (!isItemDone) {
                    allItemsReady = false
                }
                if (item.status === 'preparing') {
                    anyItemPreparing = true
                }
            })

            // Determine new overall status
            let newOverallStatus = order.status
            if (status !== 'cancelled') {
                if (allItemsReady) {
                    newOverallStatus = status === 'completed' ? 'completed' : 'ready'
                } else if (anyItemPreparing || status === 'preparing') {
                    newOverallStatus = 'preparing'
                }
            }

            order.status = newOverallStatus
        } else {
            // Global update (admin/cashier)
            order.status = status
            // Also update all items to match global status if needed
            order.items.forEach((item: any) => {
                item.status = status
            })
        }

        // 🔗 BUSINESS LOGIC: Restore stock if order is cancelled
        if (status === "cancelled" && previousStatus !== "cancelled") {
            const stockConsumptionMap = await calculateStockConsumption(order.items)
            await applyStockAdjustment(stockConsumptionMap, 1) // 1 = Restore
            console.log(`📡 Restored stock for cancelled order #${order.orderNumber}`)
        }

        // Set timestamps and calculate delay
        const now = new Date()

        if (status === "preparing" && previousStatus !== "preparing") {
            order.kitchenAcceptedAt = now
        }

        if (status === "ready" && previousStatus !== "ready") {
            order.readyAt = now
        }

        if ((status === "served" || status === "completed") &&
            (previousStatus !== "served" && previousStatus !== "completed")) {

            order.servedAt = now
            const startTimestamp = order.kitchenAcceptedAt || order.createdAt
            const createdAt = new Date(startTimestamp)
            const durationMs = now.getTime() - createdAt.getTime()
            const totalMinutes = Math.floor(durationMs / 60000)

            // Store the total time taken
            order.totalPreparationTime = totalMinutes

            // Calculate/Ensure threshold
            let dynamicThreshold = order.thresholdMinutes

            if (!dynamicThreshold) {
                const menuItemIds = order.items.map((item: any) => item.menuItemId)
                const menuItems = await (MenuItem as any).find({ _id: { $in: menuItemIds } }).lean()

                const itemPrepTimes = menuItems.map((mi: any) => (mi as any).preparationTime || 0)
                const maxPrepTime = itemPrepTimes.length > 0 ? Math.max(...itemPrepTimes) : 0

                // Get global fallback from settings (default 20 mins)
                const thresholdSetting = await (Settings as any).findOne({ key: "PREPARATION_TIME_THRESHOLD" })
                const globalFallback = thresholdSetting ? parseInt(thresholdSetting.value) : 20

                dynamicThreshold = maxPrepTime > 0 ? maxPrepTime : globalFallback
                order.thresholdMinutes = dynamicThreshold
            }

            // Calculate excess delay
            const excessDelay = Math.max(0, totalMinutes - dynamicThreshold)
            order.delayMinutes = excessDelay

            console.log(`⏱️ Order #${order.orderNumber} served. Total: ${totalMinutes}m, Target: ${dynamicThreshold}m, Delay: ${excessDelay}m`)

            if (excessDelay > 0) {
                addNotification(
                    "warning",
                    `⚠️ Delay Alert: Order #${order.orderNumber} took ${totalMinutes} minutes to serve! (${excessDelay}m over target of ${dynamicThreshold}m)`,
                    "admin"
                )
            }

            addNotification(
                "success",
                `💰 Order #${order.orderNumber} ${status} - Revenue: ${order.totalAmount} Br`,
                "admin"
            )
        }

        // Save updated order
        const updatedOrder = await order.save()

        // Send status update notifications
        if (status !== previousStatus) {
            const statusMessages = {
                pending: "📋 Order is pending preparation",
                preparing: "👨‍🍳 Order is being prepared",
                ready: "🔔 Order is ready for pickup",
                served: "🍽️ Order has been served to table",
                completed: "✅ Order has been completed"
            }

            addNotification(
                "info",
                `${statusMessages[status as keyof typeof statusMessages]} - Order #${order.orderNumber}`,
                (status === "ready" || status === "served") ? "cashier" : "chef"
            )
        }

        const serializedOrder = {
            ...updatedOrder.toObject(),
            _id: updatedOrder._id.toString()
        }

        return NextResponse.json(serializedOrder)
    } catch (error: any) {
        console.error("❌ Update order error:", error)
        return NextResponse.json({ message: error.message || "Failed to update order" }, { status: 500 })
    }
}

// DELETE order
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await validateSession(request)
        await connectDB()

        const { id } = await params

        const orderToDelete = await (Order as any).findById(id)
        if (!orderToDelete) {
            return NextResponse.json({ message: "Order not found" }, { status: 404 })
        }

        // 🔗 BUSINESS LOGIC: Restore stock on deletion if the order was active
        const status = orderToDelete.status
        if (status === 'pending' || status === 'preparing' || status === 'ready') {
            const stockConsumptionMap = await calculateStockConsumption(orderToDelete.items)
            await applyStockAdjustment(stockConsumptionMap, 1) // 1 = Restore
            console.log(`📡 Restored stock for deleted order #${orderToDelete.orderNumber}`)
        }

        await (Order as any).findByIdAndUpdate(id, { isDeleted: true, status: "cancelled" })

        // Send cancellation notification
        addNotification(
            "info",
            `🗑️ Order #${orderToDelete.orderNumber} has been moved to deleted history`,
            "admin"
        )

        return NextResponse.json({ message: "Order moved to history successfully" })
    } catch (error: any) {
        console.error("❌ Delete order error:", error)
        return NextResponse.json({ message: error.message || "Failed to delete order" }, { status: 500 })
    }
}