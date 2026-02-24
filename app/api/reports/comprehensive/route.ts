import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Order from "@/lib/models/order"
import MenuItem from "@/lib/models/menu-item"
import Stock from "@/lib/models/stock"
import DailyExpense from "@/lib/models/daily-expense"
import { validateSession } from "@/lib/auth"

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const period = searchParams.get("period") || "today"
        const format = searchParams.get("format") || "json" // json, csv, pdf

        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()

        // Calculate date range
        let startDate = new Date()
        let endDate = new Date()
        endDate.setHours(23, 59, 59, 999)

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        switch (period) {
            case "today":
                startDate = today
                break
            case "week":
                const day = today.getDay()
                const diff = today.getDate() - day + (day === 0 ? -6 : 1)
                startDate = new Date(today.setDate(diff))
                startDate.setHours(0, 0, 0, 0)
                break
            case "month":
                startDate = new Date(today.getFullYear(), today.getMonth(), 1)
                break
            case "year":
                startDate = new Date(today.getFullYear(), 0, 1)
                break
        }

        // Fetch all data
        const [orders, stockItems, menuItems, dailyExpenses] = await Promise.all([
            Order.find({
                createdAt: { $gte: startDate, $lte: endDate },
                status: { $ne: "cancelled" }
            }).sort({ createdAt: -1 }).lean(),
            Stock.find({}).lean(),
            MenuItem.find({}).lean(),
            DailyExpense.find({
                date: { $gte: startDate, $lte: endDate }
            }).lean()
        ])

        // Calculate comprehensive metrics
        const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0)
        const totalOrders = orders.length
        const completedOrders = orders.filter(o => o.status === "completed").length

        // Expense calculations
        const totalOtherExpenses = dailyExpenses.reduce((sum, exp) => sum + (exp.otherExpenses || 0), 0)

        // Stock calculations
        const totalStockValue = stockItems
            .reduce((sum, item) => sum + (item.quantity * (item.unitCost || 0)), 0)

        // Total investment = Other expenses + Total stock assets
        const totalInvestment = totalOtherExpenses + totalStockValue

        // Net worth = Revenue - Total investment (Orders - (Asset + Expenses))
        const netProfit = totalRevenue - totalInvestment
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

        // Stock consumption analysis
        const menuMap = new Map(menuItems.map(m => [m._id.toString(), m]))
        const stockConsumption: Record<string, { name: string, consumed: number, unit: string, cost: number }> = {}

        orders.forEach(order => {
            if (order.status === "completed") {
                order.items.forEach((item: any) => {
                    const menuData = menuMap.get(item.menuItemId)
                    if (menuData && menuData.stockItemId && menuData.reportQuantity) {
                        const stockItem = stockItems.find(s => s._id.toString() === (menuData.stockItemId as any)._id?.toString())
                        if (stockItem) {
                            const consumedAmount = menuData.reportQuantity * item.quantity
                            const key = stockItem.name

                            if (!stockConsumption[key]) {
                                stockConsumption[key] = {
                                    name: stockItem.name,
                                    consumed: 0,
                                    unit: stockItem.unit || '',
                                    cost: 0
                                }
                            }

                            stockConsumption[key].consumed += consumedAmount
                            stockConsumption[key].cost += consumedAmount * (stockItem.unitCost || 0)
                        }
                    }
                })
            }
        })

        // Low stock alerts
        const lowStockAlerts = stockItems
            .filter(item => item.trackQuantity && item.minLimit && (item.quantity || 0) <= (item.minLimit || 0))
            .map(item => ({
                name: item.name,
                current: item.quantity || 0,
                minimum: item.minLimit || 0,
                unit: item.unit || '',
                urgency: (item.quantity || 0) === 0 ? 'critical' as const : 'warning' as const
            }))

        // Category performance
        const categoryStats = new Map<string, { revenue: number, orders: number }>()
        orders.forEach(order => {
            order.items.forEach((item: any) => {
                const menuData = menuMap.get(item.menuItemId)
                const category = menuData?.category || 'Unknown'
                const existing = categoryStats.get(category) || { revenue: 0, orders: 0 }
                existing.revenue += item.price * item.quantity
                existing.orders += 1
                categoryStats.set(category, existing)
            })
        })

        const totalCategoryRevenue = Array.from(categoryStats.values()).reduce((sum, cat) => sum + cat.revenue, 0)
        const categoryPerformance = Array.from(categoryStats.entries()).map(([category, data]) => ({
            category,
            ...data,
            percentage: totalCategoryRevenue > 0 ? (data.revenue / totalCategoryRevenue) * 100 : 0
        }))

        const comprehensiveReport = {
            period,
            startDate,
            endDate,
            generatedAt: new Date(),

            // Financial Overview
            financial: {
                totalRevenue,
                totalOtherExpenses,
                totalStockValue, // All stock assets
                totalInvestment,
                netProfit,
                profitMargin
            },

            // Operational Metrics
            operational: {
                totalOrders,
                completedOrders,
                averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
                completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
            },

            // Stock Analysis
            inventory: {
                totalStockValue, // All assets
                lowStockAlerts,
                stockConsumption: Object.values(stockConsumption),
                categoryPerformance
            },

            // Raw data for detailed exports
            orders: orders.map(order => ({
                orderNumber: order.orderNumber,
                date: order.createdAt,
                status: order.status,
                totalAmount: order.totalAmount,
                paymentMethod: order.paymentMethod,
                itemsCount: order.items.length
            })),

            stockItems: stockItems.map(item => ({
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                unit: item.unit,
                unitCost: item.unitCost,
                totalValue: (item.quantity || 0) * (item.unitCost || 0),
                status: item.status
            })),

            dailyExpenses: dailyExpenses.map(exp => ({
                date: exp.date,
                otherExpenses: exp.otherExpenses,
                items: exp.items
            }))
        }

        return NextResponse.json(comprehensiveReport)

    } catch (error: any) {
        console.error("❌ Comprehensive Report Error:", error)
        return NextResponse.json({ message: "Failed to generate comprehensive report" }, { status: 500 })
    }
}