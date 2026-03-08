import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Order from "@/lib/models/order"
import MenuItem from "@/lib/models/menu-item"
import Settings from "@/lib/models/settings"
import { addNotification } from "@/lib/notifications"
import { validateSession } from "@/lib/auth"

// POST /api/orders/bulk-serve - Mark all active orders as served
export async function POST(request: Request) {
    try {
        const decoded = await validateSession(request)
        if (decoded.role !== "admin") {
            return NextResponse.json({ message: "Forbidden - Admin access required" }, { status: 403 })
        }

        await connectDB()

        const now = new Date()

        // Get the global threshold setting
        const thresholdSetting = await (Settings as any).findOne({ key: "PREPARATION_TIME_THRESHOLD" })
        const globalFallback = thresholdSetting ? parseInt(thresholdSetting.value) : 20

        // Find all active (non-deleted, non-served, non-cancelled) orders
        const activeOrders = await (Order as any).find({
            isDeleted: { $ne: true },
            status: { $nin: ["served", "completed", "cancelled"] }
        })

        if (activeOrders.length === 0) {
            return NextResponse.json({ message: "No active orders to mark as served", servedCount: 0 })
        }

        let servedCount = 0

        for (const order of activeOrders) {
            const previousStatus = order.status

            order.status = "served"
            order.items.forEach((item: any) => {
                item.status = "served"
            })

            // Set timestamps
            order.servedAt = now
            const createdAt = new Date(order.createdAt)
            const durationMs = now.getTime() - createdAt.getTime()
            const totalMinutes = Math.floor(durationMs / 60000)
            order.totalPreparationTime = totalMinutes

            // Calculate threshold
            let dynamicThreshold = order.thresholdMinutes
            if (!dynamicThreshold) {
                const isValidObjectId = (id: any) =>
                    id && typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id)
                const menuItemIds = order.items
                    .map((item: any) => item.menuItemId)
                    .filter(isValidObjectId)
                const menuItems = menuItemIds.length > 0
                    ? await (MenuItem as any).find({ _id: { $in: menuItemIds } }).lean()
                    : []
                const itemPrepTimes = menuItems.map((mi: any) => (mi as any).preparationTime || 0)
                const maxPrepTime = itemPrepTimes.length > 0 ? Math.max(...itemPrepTimes) : 0
                dynamicThreshold = maxPrepTime > 0 ? maxPrepTime : globalFallback
                order.thresholdMinutes = dynamicThreshold
            }

            const excessDelay = Math.max(0, totalMinutes - dynamicThreshold)
            order.delayMinutes = excessDelay

            await order.save()
            servedCount++

            addNotification(
                "success",
                `💰 Order #${order.orderNumber} served - Revenue: ${order.totalAmount} Br`,
                "admin"
            )
        }

        addNotification(
            "info",
            `🍽️ Bulk action: ${servedCount} orders marked as served`,
            "cashier"
        )

        return NextResponse.json({
            message: `${servedCount} orders marked as served successfully`,
            servedCount
        })
    } catch (error: any) {
        console.error("❌ Bulk serve error:", error)
        return NextResponse.json({ message: error.message || "Failed to mark orders as served" }, { status: 500 })
    }
}
