import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Order from "@/lib/models/order"
import MenuItem from "@/lib/models/menu-item"
import Stock from "@/lib/models/stock"
import DailyExpense from "@/lib/models/daily-expense"
import StoreLog from "@/lib/models/store-log"
import { validateSession } from "@/lib/auth"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "today"
    const customStart = searchParams.get("startDate")
    const customEnd = searchParams.get("endDate")
    const startTime = Date.now()

    try {
        const decoded = await validateSession(request)

        if (decoded.role !== "admin" && decoded.role !== "super-admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 })

        await connectDB()

        // Performance check
        const checkTimeout = () => {
            if (Date.now() - startTime > 15000) {
                throw new Error("Request timeout - data processing taking too long")
            }
        }

        // 1. Determine Date Range
        let startDate = new Date()
        let endDate = new Date()
        endDate.setHours(23, 59, 59, 999)

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
        }

        // 2. Fetch Data
        checkTimeout()
        checkTimeout()
        // FIX: Include ALL active orders (not just completed) to reflect real-time stock deductions
        // Stock is deducted at creation, so 'pending', 'preparing', 'ready', 'served', and 'completed'
        // should all count towards consumption. Only 'cancelled' is excluded.
        const orders = await Order.find({
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $ne: "cancelled" }
        }).select('items totalAmount createdAt status').lean() as any[]

        const stockItems = await Stock.find({}).select('name category quantity storeQuantity unit unitCost averagePurchasePrice totalInvestment minLimit storeMinLimit status supplier updatedAt totalPurchased').lean() as any[]
        const menuItems = await MenuItem.find({}).select('name reportUnit reportQuantity stockItemId recipe').lean() as any[]
        const menuMap = new Map(menuItems.map(m => [m._id.toString(), m]))

        const dailyExpenses = await DailyExpense.find({
            date: { $gte: startDate, $lte: endDate }
        }).select('date otherExpenses items').lean()

        const storeLogs = await StoreLog.find({
            date: { $gte: startDate, $lte: endDate },
            type: 'TRANSFER_OUT'
        }).lean()

        // 3. Process Purchases & Transfers
        const purchaseStats: Record<string, { quantity: number, totalCost: number, transactions: any[] }> = {}
        const purchasesByDate: Record<string, any[]> = {}
        let totalOtherExpenses = 0

        const transferStats: Record<string, { quantity: number }> = {}
        storeLogs.forEach((log: any) => {
            const stockId = log.stockId.toString()
            if (!transferStats[stockId]) transferStats[stockId] = { quantity: 0 }
            transferStats[stockId].quantity += log.quantity
        })

        dailyExpenses.forEach((exp: any) => {
            const dateKey = new Date(exp.date).toISOString().split('T')[0]
            if (!purchasesByDate[dateKey]) purchasesByDate[dateKey] = []
            totalOtherExpenses += (exp.otherExpenses || 0)

            exp.items?.forEach((item: any) => {
                const nameKey = item.name.toLowerCase()
                if (!purchaseStats[nameKey]) {
                    purchaseStats[nameKey] = { quantity: 0, totalCost: 0, transactions: [] }
                }
                purchaseStats[nameKey].quantity += (item.quantity || 0)
                purchaseStats[nameKey].totalCost += (item.amount || 0)
                purchaseStats[nameKey].transactions.push({
                    date: exp.date,
                    quantity: item.quantity,
                    cost: item.amount,
                    unit: item.unit
                })

                purchasesByDate[dateKey].push({
                    name: item.name,
                    quantity: item.quantity,
                    cost: item.amount,
                    unit: item.unit
                })
            })

            if (exp.otherExpenses > 0) {
                purchasesByDate[dateKey].push({
                    name: "Other Expenses",
                    quantity: 1,
                    cost: exp.otherExpenses,
                    unit: "misc"
                })
            }
        })

        // 4. Calculate Consumption
        const usageStats: Record<string, { unit: string, total: number, items: any[] }> = {
            'kg': { unit: 'kg', total: 0, items: [] },
            'liter': { unit: 'liter', total: 0, items: [] },
            'piece': { unit: 'piece', total: 0, items: [] },
            'g': { unit: 'g', total: 0, items: [] },
            'ml': { unit: 'ml', total: 0, items: [] }
        }

        const normalizeUnit = (unit: string): string => {
            const u = unit?.toLowerCase() || 'piece'
            if (['l', 'liter', 'litre', 'liters'].includes(u)) return 'liter'
            if (['ml', 'milliliter', 'millilitre'].includes(u)) return 'ml'
            if (['kg', 'kilogram', 'kilograms'].includes(u)) return 'kg'
            if (['g', 'gram', 'grams', 'gr'].includes(u)) return 'g'
            return u
        }

        const itemConsumption: Record<string, { name: string, unit: string, quantity: number, stockId: string, orders: any[] }> = {}
        const ordersByDate: Record<string, any[]> = {}

        for (const order of orders) {
            const orderDate = new Date(order.createdAt).toISOString().split('T')[0]
            if (!ordersByDate[orderDate]) ordersByDate[orderDate] = []
            ordersByDate[orderDate].push(order)

            for (const item of order.items) {
                if (!item.menuItemId) {
                    console.log(`⚠️ Item in order ${order._id} missing menuItemId`)
                    continue;
                }
                const menuData = menuMap.get(item.menuItemId?.toString())

                if (menuData) {
                    // console.log(`🔍 Processing ${item.name} (${item.quantity}) -> Menu: ${menuData.name}`)

                    // Recipe System
                    if (menuData.recipe && menuData.recipe.length > 0) {
                        for (const ingredient of menuData.recipe) {
                            if (!ingredient.stockItemId) {
                                console.log(`⚠️ Ingredient ${ingredient.stockItemName} missing stockItemId`)
                                continue;
                            }
                            const unit = normalizeUnit(ingredient.unit)
                            const amount = (ingredient.quantityRequired || 0) * item.quantity

                            if (!usageStats[unit]) usageStats[unit] = { unit: unit, total: 0, items: [] }

                            // Special handling for Liter/ml conversion for summary
                            let consumptionValue = amount
                            let baseUnit = unit
                            if (unit === 'ml') {
                                usageStats['liter'].total += (amount / 1000)
                            } else if (unit === 'liter') {
                                usageStats['liter'].total += amount
                            } else if (unit === 'g') {
                                usageStats['kg'].total += (amount / 1000)
                            } else if (unit === 'kg') {
                                usageStats['kg'].total += amount
                            } else if (unit === 'piece') {
                                usageStats['piece'].total += amount
                            }

                            usageStats[unit].total += amount
                            usageStats[unit].items.push({
                                menuItem: menuData.name,
                                stockItem: ingredient.stockItemName,
                                quantity: item.quantity,
                                consumption: amount,
                                baseUnit: unit,
                                orderId: order._id,
                                date: order.createdAt
                            })

                            const stockId = ingredient.stockItemId.toString()
                            if (!itemConsumption[stockId]) {
                                itemConsumption[stockId] = { name: menuData.name, unit: unit, quantity: 0, stockId: stockId, orders: [] }
                            }
                            itemConsumption[stockId].quantity += amount
                            itemConsumption[stockId].orders.push({
                                orderId: order._id,
                                quantity: item.quantity,
                                consumption: amount,
                                date: order.createdAt,
                                menuItemName: menuData.name
                            })
                            // console.log(`✅ Consumed ${amount} ${unit} of ${ingredient.stockItemName} (StockID: ${stockId})`)
                        }
                    }
                    // Legacy Fallback
                    else if (menuData.stockItemId) {
                        const unit = menuData.reportUnit || 'piece'
                        const consumptionRatio = menuData.reportQuantity || 1
                        const amount = consumptionRatio * item.quantity

                        if (usageStats[unit]) {
                            usageStats[unit].total += amount
                            usageStats[unit].items.push({
                                menuItem: menuData.name,
                                quantity: item.quantity,
                                consumption: amount,
                                orderId: order._id,
                                date: order.createdAt
                            })
                        }

                        const stockId = menuData.stockItemId.toString()
                        if (!itemConsumption[stockId]) {
                            itemConsumption[stockId] = { name: menuData.name, unit: unit, quantity: 0, stockId: stockId, orders: [] }
                        }
                        itemConsumption[stockId].quantity += amount
                        itemConsumption[stockId].orders.push({
                            orderId: order._id,
                            quantity: item.quantity,
                            consumption: amount,
                            date: order.createdAt
                        })
                        // console.log(`✅ Consumed ${amount} ${unit} (Legacy) via ${menuData.name} (StockID: ${stockId})`)
                    } else {
                        console.log(`⚠️ Menu item ${menuData.name} has no recipe or stockItemId`)
                    }
                } else {
                    console.log(`⚠️ Menu Data not found for ID: ${item.menuItemId}`)
                }
            }
        }

        // 5. Stock Analysis
        const periodDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))

        const stockAnalysis = stockItems.map(stock => {
            const fullName = stock.name.toLowerCase()
            const rootName = fullName.split(' (finished')[0].trim()
            const purchaseData = purchaseStats[rootName] || purchaseStats[fullName] || { quantity: 0, totalCost: 0, transactions: [] }
            const purchased = purchaseData.quantity
            const transferred = transferStats[stock._id.toString()]?.quantity || 0

            const consumptionData = Object.values(itemConsumption).filter(c => c.stockId === stock._id.toString())
            const consumed = consumptionData.reduce((acc, c) => acc + c.quantity, 0)

            const currentStock = stock.quantity || 0
            const openingStock = Math.max(0, currentStock - transferred + consumed)

            const currentStoreStock = stock.storeQuantity || 0
            const storeOpeningStock = Math.max(0, currentStoreStock - purchased + transferred)

            const currentUnitCost = stock.unitCost || 0
            const totalHandled = openingStock + transferred
            const weightedAvgCost = purchased > 0
                ? ((openingStock * (stock.averagePurchasePrice || 0)) + purchaseData.totalCost) / (openingStock + purchased)
                : (stock.averagePurchasePrice || 0)

            return {
                id: stock._id,
                name: stock.name,
                category: stock.category,
                unit: stock.unit,
                openingStock,
                purchased,
                transferred,
                consumed,
                closingStock: currentStock,
                storeQuantity: currentStoreStock,
                storeOpeningStock,
                currentUnitCost,
                weightedAvgCost,
                averagePurchasePrice: stock.averagePurchasePrice || 0,
                totalLifetimeInvestment: stock.totalInvestment || 0,
                totalLifetimePurchased: stock.totalPurchased || 0,

                openingValue: openingStock * currentUnitCost,
                purchaseValue: purchaseData.totalCost,
                transferredValue: transferred * currentUnitCost,
                consumedValue: consumed * currentUnitCost,
                closingValue: currentStock * currentUnitCost,
                storeClosingValue: currentStoreStock * currentUnitCost,
                usageVelocity: periodDays > 0 ? consumed / periodDays : 0,
                isLowStock: currentStock <= (stock.minLimit || 0),
                minLimit: stock.minLimit || 0,
                isLowStoreStock: currentStoreStock <= (stock.storeMinLimit || 0),
                storeMinLimit: stock.storeMinLimit || 0,
                status: stock.status,
                supplier: stock.supplier || 'N/A',
                lastUpdated: stock.updatedAt,
                purchaseTransactions: purchaseData.transactions,
                consumptionDetails: consumptionData
            }
        })

        // 6. Summary and Return
        const totalOpeningValue = stockAnalysis.reduce((sum, item) => sum + item.openingValue, 0)
        const totalPurchaseValue = stockAnalysis.reduce((sum, item) => sum + item.purchaseValue, 0)
        const totalTransferredValue = stockAnalysis.reduce((sum, item) => sum + item.transferredValue, 0)
        const totalConsumedValue = stockAnalysis.reduce((sum, item) => sum + item.consumedValue, 0)
        const totalClosingValue = stockAnalysis.reduce((sum, item) => sum + item.closingValue, 0)
        const totalStoreClosingValue = stockAnalysis.reduce((sum, item) => sum + item.storeClosingValue, 0)
        const totalAssetValue = totalClosingValue + totalStoreClosingValue
        const totalLifetimeInvestment = stockItems.reduce((sum, item) => sum + (item.totalInvestment || 0), 0)
        const totalExpenses = totalPurchaseValue + totalOtherExpenses

        return NextResponse.json({
            period,
            summary: {
                totalOrders: orders.length,
                totalRevenue: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
                totalExpenses,
                totalPurchaseValue,
                totalTransferredValue,
                totalOtherExpenses,
                totalOpeningValue,
                totalConsumedValue,
                totalClosingValue,
                totalStoreClosingValue,
                totalAssetValue,
                totalLifetimeInvestment,
                totalCostOfGoodsSold: totalConsumedValue,
                totalBeef: usageStats['kg'].total,
                totalMilk: usageStats['liter'].total,
                totalDrinks: usageStats['piece'].total,
                lowStockItemsCount: stockAnalysis.filter(item => item.isLowStock).length,
                grossProfit: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0) - totalConsumedValue,
                netProfit: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0) - totalExpenses
            },
            stockAnalysis,
            usage: Object.values(usageStats),
            dailyBreakdown: { purchases: purchasesByDate, orders: ordersByDate }
        })

    } catch (error: any) {
        console.error("❌ Stock Usage Report Error:", error)
        return NextResponse.json({
            message: "Failed to generate report",
            error: error.message
        }, { status: 500 })
    }
}
