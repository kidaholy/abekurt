import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Order from "@/lib/models/order"
import MenuItem from "@/lib/models/menu-item"
import Stock from "@/lib/models/stock"
import DailyExpense from "@/lib/models/daily-expense"
import { validateSession } from "@/lib/auth"

interface BusinessMetrics {
  realTimeMetrics: {
    todayRevenue: number
    todayOrders: number
    activeOrders: number
    completionRate: number
    averageOrderValue: number
    hourlyRevenue: Array<{ hour: string; revenue: number; orders: number }>
  }
  salesAnalytics: {
    topSellingItems: Array<{ name: string; quantity: number; revenue: number; category: string }>
    categoryPerformance: Array<{ category: string; revenue: number; orders: number; percentage: number }>
    paymentMethodBreakdown: Record<string, { amount: number; count: number; percentage: number }>
    revenueGrowth: {
      daily: number
      weekly: number
      monthly: number
    }
  }
  inventoryInsights: {
    lowStockAlerts: Array<{ name: string; current: number; minimum: number; unit: string; urgency: 'critical' | 'warning' }>
    stockConsumption: Array<{ name: string; consumed: number; unit: string; cost: number }>
    inventoryValue: number
    stockTurnover: Array<{ name: string; turnoverRate: number; daysToRestock: number }>
  }
  operationalMetrics: {
    orderStatusDistribution: Record<string, number>
    averagePreparationTime: number
    peakHours: Array<{ hour: string; orderCount: number }>
    customerSatisfaction: {
      completedOrders: number
      cancelledOrders: number
      successRate: number
    }
  }
  financialOverview: {
    grossRevenue: number
    totalExpenses: number
    netProfit: number
    profitMargin: number
    costBreakdown: {
      otherExpenses: number
      stockCosts: number
    }
  }
  trends: {
    last7Days: Array<{ date: string; revenue: number; orders: number; profit: number }>
    monthlyComparison: Array<{ month: string; revenue: number; growth: number }>
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "today"
    const includeHistorical = searchParams.get("historical") === "true"

    const decoded = await validateSession(request)
    console.log("📊 User requesting business metrics:", decoded.email || decoded.id)

    await connectDB()

    // Date calculations
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)
    const yesterdayEnd = new Date(todayStart.getTime() - 1)

    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    // Fetch all relevant data
    const [
      todayOrders,
      yesterdayOrders,
      weekOrders,
      monthOrders,
      lastMonthOrders,
      allMenuItems,
      allStock,
      todayExpenses,
      monthExpenses
    ] = await Promise.all([
      Order.find({ createdAt: { $gte: todayStart, $lte: todayEnd } }).lean(),
      Order.find({ createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } }).lean(),
      Order.find({ createdAt: { $gte: weekStart, $lte: todayEnd } }).lean(),
      Order.find({ createdAt: { $gte: monthStart, $lte: todayEnd } }).lean(),
      Order.find({ createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } }).lean(),
      MenuItem.find().populate('stockItemId').lean(),
      Stock.find().lean(),
      DailyExpense.find({ date: { $gte: todayStart, $lte: todayEnd } }).lean(),
      DailyExpense.find({ date: { $gte: monthStart, $lte: todayEnd } }).lean()
    ])

    // Calculate Real-Time Metrics
    const todayRevenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((sum, order) => sum + order.totalAmount, 0)
    const activeOrders = todayOrders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).length
    const completedToday = todayOrders.filter(o => o.status === 'completed').length
    const completionRate = todayOrders.length > 0 ? (completedToday / todayOrders.length) * 100 : 0
    const averageOrderValue = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0

    // Hourly revenue breakdown
    const hourlyRevenue = Array.from({ length: 24 }, (_, hour) => {
      const hourStart = new Date(todayStart.getTime() + hour * 60 * 60 * 1000)
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000 - 1)
      const hourOrders = todayOrders.filter(o =>
        new Date(o.createdAt) >= hourStart && new Date(o.createdAt) <= hourEnd && o.status !== 'cancelled'
      )
      return {
        hour: `${hour.toString().padStart(2, '0')}:00`,
        revenue: hourOrders.reduce((sum, order) => sum + order.totalAmount, 0),
        orders: hourOrders.length
      }
    })

    // Sales Analytics
    const itemSales = new Map<string, { quantity: number; revenue: number; category: string }>()

    todayOrders.forEach(order => {
      if (order.status !== 'cancelled') {
        order.items.forEach((item: any) => {
          const existing = itemSales.get(item.name) || { quantity: 0, revenue: 0, category: '' }
          const menuItem = allMenuItems.find(m => m._id.toString() === item.menuItemId)
          existing.quantity += item.quantity
          existing.revenue += item.price * item.quantity
          existing.category = menuItem?.category || 'Unknown'
          itemSales.set(item.name, existing)
        })
      }
    })

    const topSellingItems = Array.from(itemSales.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Category performance
    const categoryStats = new Map<string, { revenue: number; orders: number }>()
    todayOrders.forEach(order => {
      if (order.status !== 'cancelled') {
        order.items.forEach((item: any) => {
          const menuItem = allMenuItems.find(m => m._id.toString() === item.menuItemId)
          const category = menuItem?.category || 'Unknown'
          const existing = categoryStats.get(category) || { revenue: 0, orders: 0 }
          existing.revenue += item.price * item.quantity
          existing.orders += 1
          categoryStats.set(category, existing)
        })
      }
    })

    const totalCategoryRevenue = Array.from(categoryStats.values()).reduce((sum, cat) => sum + cat.revenue, 0)
    const categoryPerformance = Array.from(categoryStats.entries()).map(([category, data]) => ({
      category,
      ...data,
      percentage: totalCategoryRevenue > 0 ? (data.revenue / totalCategoryRevenue) * 100 : 0
    }))

    // Payment method breakdown
    const paymentStats = new Map<string, { amount: number; count: number }>()
    todayOrders.forEach(order => {
      if (order.status !== 'cancelled') {
        const method = order.paymentMethod || 'cash'
        const existing = paymentStats.get(method) || { amount: 0, count: 0 }
        existing.amount += order.totalAmount
        existing.count += 1
        paymentStats.set(method, existing)
      }
    })

    const totalPaymentAmount = Array.from(paymentStats.values()).reduce((sum, p) => sum + p.amount, 0)
    const paymentMethodBreakdown = Object.fromEntries(
      Array.from(paymentStats.entries()).map(([method, data]) => [
        method,
        {
          ...data,
          percentage: totalPaymentAmount > 0 ? (data.amount / totalPaymentAmount) * 100 : 0
        }
      ])
    )

    // Revenue growth calculations
    const yesterdayRevenue = yesterdayOrders.filter(o => o.status !== 'cancelled').reduce((sum, order) => sum + order.totalAmount, 0)
    const weekRevenue = weekOrders.filter(o => o.status !== 'cancelled').reduce((sum, order) => sum + order.totalAmount, 0)
    const monthRevenue = monthOrders.filter(o => o.status !== 'cancelled').reduce((sum, order) => sum + order.totalAmount, 0)
    const lastMonthRevenue = lastMonthOrders.filter(o => o.status !== 'cancelled').reduce((sum, order) => sum + order.totalAmount, 0)

    const dailyGrowth = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0
    const weeklyGrowth = weekRevenue > 0 ? ((todayRevenue - (weekRevenue / 7)) / (weekRevenue / 7)) * 100 : 0
    const monthlyGrowth = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

    // Inventory Insights
    const lowStockAlerts = allStock
      .filter(item => item.trackQuantity && item.minLimit && item.quantity !== undefined)
      .filter(item => (item.quantity || 0) <= (item.minLimit || 0))
      .map(item => ({
        name: item.name,
        current: item.quantity || 0,
        minimum: item.minLimit || 0,
        unit: item.unit || '',
        urgency: (item.quantity || 0) === 0 ? 'critical' as const : 'warning' as const
      }))

    // Stock consumption calculation
    const stockConsumption = new Map<string, { consumed: number; unit: string; cost: number }>()

    todayOrders.forEach(order => {
      if (order.status !== 'cancelled') {
        order.items.forEach((item: any) => {
          const menuItem = allMenuItems.find(m => m._id.toString() === item.menuItemId)
          if (menuItem && menuItem.stockItemId && menuItem.reportQuantity) {
            const stockItem = allStock.find(s => s._id.toString() === (menuItem.stockItemId as any)._id?.toString())
            if (stockItem) {
              const consumedAmount = menuItem.reportQuantity * item.quantity
              const existing = stockConsumption.get(stockItem.name) || { consumed: 0, unit: stockItem.unit || '', cost: 0 }
              existing.consumed += consumedAmount
              existing.cost += consumedAmount * (stockItem.unitCost || 0)
              stockConsumption.set(stockItem.name, existing)
            }
          }
        })
      }
    })

    const stockConsumptionArray = Array.from(stockConsumption.entries()).map(([name, data]) => ({ name, ...data }))

    // Inventory value
    const inventoryValue = allStock.reduce((sum, item) => {
      if (item.trackQuantity && item.quantity && item.unitCost) {
        return sum + (item.quantity * item.unitCost)
      }
      return sum
    }, 0)

    // Operational Metrics
    const orderStatusDistribution = todayOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Peak hours analysis
    const hourlyOrderCount = Array.from({ length: 24 }, (_, hour) => {
      const hourStart = new Date(todayStart.getTime() + hour * 60 * 60 * 1000)
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000 - 1)
      const hourOrders = todayOrders.filter(o =>
        new Date(o.createdAt) >= hourStart && new Date(o.createdAt) <= hourEnd
      )
      return {
        hour: `${hour.toString().padStart(2, '0')}:00`,
        orderCount: hourOrders.length
      }
    }).sort((a, b) => b.orderCount - a.orderCount)

    // Financial Overview
    const todayExpensesTotal = todayExpenses.reduce((sum, exp) => sum + (exp.otherExpenses || 0), 0)
    const monthExpensesTotal = monthExpenses.reduce((sum, exp) => sum + (exp.otherExpenses || 0), 0)
    const stockCosts = stockConsumptionArray.reduce((sum, item) => sum + item.cost, 0)

    const grossRevenue = todayRevenue
    const totalExpenses = todayExpensesTotal + stockCosts
    const netProfit = grossRevenue - totalExpenses
    const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0

    // Trends (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000)
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

      const dayOrders = weekOrders.filter(o =>
        new Date(o.createdAt) >= dayStart &&
        new Date(o.createdAt) <= dayEnd &&
        o.status !== 'cancelled'
      )

      const dayRevenue = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0)

      return {
        date: date.toISOString().split('T')[0],
        revenue: dayRevenue,
        orders: dayOrders.length,
        profit: dayRevenue * 0.7 // Estimated profit margin
      }
    }).reverse()

    const businessMetrics: BusinessMetrics = {
      realTimeMetrics: {
        todayRevenue,
        todayOrders: todayOrders.length,
        activeOrders,
        completionRate: Math.round(completionRate * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        hourlyRevenue
      },
      salesAnalytics: {
        topSellingItems,
        categoryPerformance,
        paymentMethodBreakdown,
        revenueGrowth: {
          daily: Math.round(dailyGrowth * 100) / 100,
          weekly: Math.round(weeklyGrowth * 100) / 100,
          monthly: Math.round(monthlyGrowth * 100) / 100
        }
      },
      inventoryInsights: {
        lowStockAlerts,
        stockConsumption: stockConsumptionArray,
        inventoryValue: Math.round(inventoryValue * 100) / 100,
        stockTurnover: [] // Could be enhanced with historical data
      },
      operationalMetrics: {
        orderStatusDistribution,
        averagePreparationTime: 15, // Could be calculated from order timestamps
        peakHours: hourlyOrderCount.slice(0, 5),
        customerSatisfaction: {
          completedOrders: completedToday,
          cancelledOrders: todayOrders.filter(o => o.status === 'cancelled').length,
          successRate: Math.round(completionRate * 100) / 100
        }
      },
      financialOverview: {
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        profitMargin: Math.round(profitMargin * 100) / 100,
        costBreakdown: {
          otherExpenses: todayExpenses.reduce((sum, exp) => sum + (exp.otherExpenses || 0), 0),
          stockCosts: Math.round(stockCosts * 100) / 100
        }
      },
      trends: {
        last7Days,
        monthlyComparison: [] // Could be enhanced with more historical data
      }
    }

    console.log("✅ Business metrics calculated successfully")
    return NextResponse.json(businessMetrics)

  } catch (error: any) {
    console.error("❌ Business metrics error:", error)
    return NextResponse.json({ message: error.message || "Failed to fetch business metrics" }, { status: 500 })
  }
}