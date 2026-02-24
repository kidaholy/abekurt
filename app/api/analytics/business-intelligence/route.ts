import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Order from "@/lib/models/order"
import DailyExpense from "@/lib/models/daily-expense"
import { validateSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const decoded = await validateSession(request)
    await connectDB()

    // Business intelligence analytics
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const [monthOrders, monthExpenses] = await Promise.all([
      Order.find({ createdAt: { $gte: monthStart } }).lean(),
      DailyExpense.find({ date: { $gte: monthStart } }).lean()
    ])

    const monthRevenue = monthOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, order) => sum + order.totalAmount, 0)

    const monthExpensesTotal = monthExpenses.reduce((sum, exp) =>
      sum + (exp.otherExpenses || 0), 0)

    const intelligence = {
      monthlyRevenue: monthRevenue,
      monthlyExpenses: monthExpensesTotal,
      profitMargin: monthRevenue > 0 ? ((monthRevenue - monthExpensesTotal) / monthRevenue) * 100 : 0,
      orderTrends: monthOrders.length,
      averageOrderValue: monthOrders.length > 0 ? monthRevenue / monthOrders.length : 0
    }

    return NextResponse.json(intelligence)
  } catch (error: any) {
    console.error("Business intelligence error:", error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}