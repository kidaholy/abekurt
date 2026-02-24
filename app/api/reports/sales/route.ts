import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Order from "@/lib/models/order"
import DailyExpense from "@/lib/models/daily-expense"
import Stock from "@/lib/models/stock"
import { validateSession } from "@/lib/auth"

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const period = searchParams.get("period") || "today"
        const customStart = searchParams.get("startDate")
        const customEnd = searchParams.get("endDate")

        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 })

        await connectDB()

        let startDate = new Date()
        let endDate = new Date()

        // Set time to end of day for endDate
        endDate.setHours(23, 59, 59, 999)

        // Calculate start date based on period
        if (customStart && customEnd) {
            startDate = new Date(customStart)
            endDate = new Date(customEnd)
            endDate.setHours(23, 59, 59, 999)
        } else {
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            switch (period) {
                case "today":
                    startDate = today
                    break
                case "week":
                    // Last 7 days
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - 7);
                    startDate.setHours(0, 0, 0, 0);
                    break
                case "month":
                    // Last 30 days
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - 30);
                    startDate.setHours(0, 0, 0, 0);
                    break
                case "year":
                    // Last 365 days
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - 365);
                    startDate.setHours(0, 0, 0, 0);
                    break
                case "all":
                    startDate = new Date(2000, 0, 1) // Effectively all
                    endDate = new Date(2100, 0, 1)
                    break
                default:
                    startDate = today
            }
        }

        // Get all orders (including cancelled) for reporting
        const allOrdersQuery = {
            createdAt: { $gte: startDate, $lte: endDate }
        }

        // Get revenue-generating orders (excluding cancelled)
        const revenueQuery = {
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $ne: "cancelled" }
        }

        const allOrders = await Order.find(allOrdersQuery).sort({ createdAt: -1 }).lean()
        const revenueOrders = await Order.find(revenueQuery).lean()

        // Aggregation for revenue (excluding cancelled orders)
        const paymentStats: any = {}
        const totalRevenue = revenueOrders.reduce((sum, order) => sum + order.totalAmount, 0)
        const totalOrders = allOrders.length
        const completedOrders = allOrders.filter(o => o.status === "completed").length
        const pendingOrders = allOrders.filter(o => o.status === "pending").length
        const cancelledOrders = allOrders.filter(o => o.status === "cancelled").length

        revenueOrders.forEach(order => {
            const method = order.paymentMethod || "cash"
            paymentStats[method] = (paymentStats[method] || 0) + order.totalAmount
        })

        // Fetch Expenses
        const expenseQuery = {
            date: { $gte: startDate, $lte: endDate }
        }
        const dailyExpenses = await DailyExpense.find(expenseQuery).lean()
        const totalOtherExpenses = dailyExpenses.reduce((sum, exp) => sum + (exp.otherExpenses || 0), 0)
        const totalExpenses = totalOtherExpenses
        const periodNetProfit = totalRevenue - totalExpenses

        // 📊 LIFETIME CUMULATIVE METRICS (Stay constant across filters)
        const [lifetimeRevenueData, allStock, allExpenses] = await Promise.all([
            Order.find({ status: { $ne: "cancelled" } }).select('totalAmount').lean(),
            Stock.find({}).select('totalInvestment').lean(),
            DailyExpense.find({}).select('otherExpenses').lean()
        ])

        const lifetimeRevenue = (lifetimeRevenueData as any[]).reduce((sum, order) => sum + (order.totalAmount || 0), 0)
        const lifetimeStockInvestment = (allStock as any[]).reduce((sum, item) => sum + (item.totalInvestment || 0), 0)
        const lifetimeOtherExpenses = (allExpenses as any[]).reduce((sum, exp) => sum + (exp.otherExpenses || 0), 0)

        const lifetimeTotalInvestment = lifetimeStockInvestment + lifetimeOtherExpenses
        const lifetimeNetWorth = lifetimeRevenue - lifetimeTotalInvestment

        return NextResponse.json({
            period,
            startDate,
            endDate,
            summary: {
                totalRevenue,
                totalOrders,
                completedOrders,
                pendingOrders,
                cancelledOrders,
                paymentStats,
                totalOtherExpenses,
                totalExpenses,
                periodNetProfit,
                lifetimeRevenue,
                lifetimeStockInvestment,
                lifetimeOtherExpenses,
                lifetimeTotalInvestment,
                lifetimeNetWorth
            },
            orders: allOrders, // Return all orders for display
            revenueOrders, // Revenue-generating orders for calculations
            dailyExpenses
        })

    } catch (error: any) {
        console.error("❌ Sales Report Error:", error)
        return NextResponse.json({ message: "Failed to generate report" }, { status: 500 })
    }
}
