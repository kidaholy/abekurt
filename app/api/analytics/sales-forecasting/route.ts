import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Order from "@/lib/models/order"
import MenuItem from "@/lib/models/menu-item"
import { validateSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const decoded = await validateSession(request)
    await connectDB()

    // Sales forecasting based on historical data
    const today = new Date()
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const recentOrders = await Order.find({
      createdAt: { $gte: last30Days },
      status: { $ne: 'cancelled' }
    }).lean()

    const dailyRevenue = recentOrders.reduce((acc, order) => {
      const date = new Date(order.createdAt).toDateString()
      acc[date] = (acc[date] || 0) + order.totalAmount
      return acc
    }, {} as Record<string, number>)

    const revenues = Object.values(dailyRevenue) as number[]
    const averageDailyRevenue = revenues.length > 0 ?
      revenues.reduce((sum, rev) => sum + rev, 0) / revenues.length : 0

    const forecast = {
      averageDailyRevenue,
      projectedWeeklyRevenue: averageDailyRevenue * 7,
      projectedMonthlyRevenue: averageDailyRevenue * 30,
      trendDirection: revenues.length >= 2 ?
        (revenues[revenues.length - 1] > revenues[0] ? 'up' : 'down') : 'stable'
    }

    return NextResponse.json(forecast)
  } catch (error: any) {
    console.error("Sales forecasting error:", error)
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: error.message }, { status })
  }
}