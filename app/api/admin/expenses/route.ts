import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import DailyExpense from "@/lib/models/daily-expense"
import Stock from "@/lib/models/stock"
import { validateSession } from "@/lib/auth"

// GET daily expenses
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const date = searchParams.get("date")
        const period = searchParams.get("period") || "month"

        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin" && decoded.role !== "store_keeper") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()

        let query: any = {}

        if (date) {
            // Specific date
            const targetDate = new Date(date)
            targetDate.setUTCHours(0, 0, 0, 0)
            query.date = targetDate
        } else {
            // Period-based query - default to last 30 days for admin view
            const now = new Date()
            let startDate = new Date()
            let endDate = new Date()

            switch (period) {
                case "today":
                    startDate.setUTCHours(0, 0, 0, 0)
                    endDate.setUTCHours(23, 59, 59, 999)
                    break
                case "week":
                    const day = now.getDay()
                    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
                    startDate = new Date(now.setDate(diff))
                    startDate.setUTCHours(0, 0, 0, 0)
                    endDate = new Date()
                    endDate.setUTCHours(23, 59, 59, 999)
                    break
                case "month":
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
                    break
                case "year":
                    startDate = new Date(now.getFullYear(), 0, 1)
                    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
                    break
                case "all":
                    startDate = new Date(2000, 0, 1) // Effectively all
                    endDate = new Date(2100, 0, 1)
                    break
                default:
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
                    break
            }

            if (period !== "all") {
                query.date = { $gte: startDate, $lte: endDate }
            }
        }

        const expenses = await DailyExpense.find(query).sort({ date: -1 }).lean()

        // Convert ObjectId to string for frontend compatibility
        const serializedExpenses = expenses.map(expense => ({
            ...expense,
            _id: expense._id.toString()
        }))

        return NextResponse.json(serializedExpenses)
    } catch (error: any) {
        console.error("❌ Get admin expenses error:", error)
        const status = error.message?.includes("Unauthorized") ? 401 : 500
        return NextResponse.json({ message: error.message || "Failed to get expenses" }, { status })
    }
}

// POST create/update daily expense with stock integration
export async function POST(request: Request) {
    try {
        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()

        const body = await request.json()
        const { date, otherExpenses, items, description } = body

        // Validate required fields
        if (!date) {
            return NextResponse.json({ message: "Date is required" }, { status: 400 })
        }

        // Normalize date to midnight UTC
        const expenseDate = new Date(date)
        expenseDate.setUTCHours(0, 0, 0, 0)

        // Check if expense already exists for this date
        const existingExpense = await DailyExpense.findOne({ date: expenseDate })

        // Calculate total other expenses from items
        const calculatedOtherExpenses = (items || []).reduce((sum: number, item: any) => sum + (item.amount || 0), 0)

        const expenseData = {
            date: expenseDate,
            otherExpenses: calculatedOtherExpenses,
            items: items || [],
            description: description || ""
        }

        let expense
        if (existingExpense) {
            // Update existing expense
            expense = await DailyExpense.findOneAndUpdate(
                { date: expenseDate },
                expenseData,
                { new: true, runValidators: true }
            )
        } else {
            // Create new expense
            expense = await DailyExpense.create(expenseData)
        }

        // 🔗 BUSINESS LOGIC: Update stock quantities based on purchases
        // If updating an existing expense, revert the old quantities first to avoid doubling
        if (existingExpense) {
            // Revert other items
            if (existingExpense.items && existingExpense.items.length > 0) {
                for (const item of existingExpense.items) {
                    if (item.quantity > 0) {
                        const oldStockItem = await Stock.findOne({
                            name: { $regex: new RegExp(`^${item.name}$`, 'i') },
                            status: { $ne: 'finished' }
                        })
                        if (oldStockItem) {
                            oldStockItem.storeQuantity = Math.max(0, (oldStockItem.storeQuantity || 0) - item.quantity)
                            await oldStockItem.save()
                        }
                    }
                }
            }
        }

        // Update other stock items based on new expense items
        if (items && items.length > 0) {
            const StoreLog = (await import("@/lib/models/store-log")).default // Dynamic import to avoid cycles or ensure loading
            for (const item of items) {
                if (item.quantity > 0 && item.name) {
                    // Try to find existing stock item
                    let stockItem = await Stock.findOne({
                        name: { $regex: new RegExp(`^${item.name}$`, 'i') },
                        status: { $ne: 'finished' }
                    })

                    const unitCost = item.quantity > 0 ? (item.amount / item.quantity) : 0

                    if (stockItem) {
                        // Update existing stock - ADD TO STORE
                        stockItem.storeQuantity = (stockItem.storeQuantity || 0) + item.quantity
                        stockItem.totalPurchased = (stockItem.totalPurchased || 0) + item.quantity
                        stockItem.totalInvestment = (stockItem.totalInvestment || 0) + item.amount

                        if (stockItem.totalPurchased > 0) {
                            stockItem.averagePurchasePrice = stockItem.totalInvestment / stockItem.totalPurchased
                        }

                        stockItem.unitCost = unitCost // Update selling price to latest purchase info (or keep it?)
                        await stockItem.save()

                        // Create Store Log
                        await StoreLog.create({
                            stockId: stockItem._id,
                            type: 'PURCHASE',
                            quantity: item.quantity,
                            unit: item.unit || 'pcs',
                            pricePerUnit: unitCost,
                            totalPrice: item.amount,
                            user: decoded.id,
                            notes: `Purchased via Expense on ${expenseDate.toLocaleDateString()}`
                        })
                    } else {
                        // Create new stock item 
                        const unit = (item.unit || 'pcs').toLowerCase()
                        let unitType = 'count'
                        if (['kg', 'g', 'gram', 'kilogram'].includes(unit)) {
                            unitType = 'weight'
                        } else if (['l', 'ml', 'liter', 'litre', 'milliliter'].includes(unit)) {
                            unitType = 'volume'
                        }

                        const newStockItem = await Stock.create({
                            name: item.name,
                            category: 'supplies',
                            quantity: 0, // Stock starts at 0
                            storeQuantity: item.quantity, // Add to STORE
                            unit: item.unit || 'pcs',
                            unitType,
                            minLimit: 0,
                            averagePurchasePrice: unitCost,
                            unitCost,
                            trackQuantity: true,
                            showStatus: true,
                            status: 'active',
                            totalPurchased: item.quantity,
                            totalConsumed: 0,
                            totalInvestment: item.amount || 0
                        })

                        // Create Store Log
                        await StoreLog.create({
                            stockId: newStockItem._id,
                            type: 'PURCHASE',
                            quantity: item.quantity,
                            unit: item.unit || 'pcs',
                            pricePerUnit: unitCost,
                            totalPrice: item.amount,
                            user: decoded.id,
                            notes: `Initial purchase via Expense on ${expenseDate.toLocaleDateString()}`
                        })
                    }
                }
            }
        }

        const serializedExpense = {
            ...expense.toObject(),
            _id: expense._id.toString()
        }

        return NextResponse.json(serializedExpense, { status: existingExpense ? 200 : 201 })
    } catch (error: any) {
        console.error("❌ Create/Update admin expense error:", error)
        const status = error.message?.includes("Unauthorized") ? 401 : 500
        return NextResponse.json({ message: error.message || "Failed to save expense" }, { status })
    }
}

// DELETE daily expense
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        if (!id) {
            return NextResponse.json({ message: "Expense ID is required" }, { status: 400 })
        }

        await connectDB()

        const deletedExpense = await DailyExpense.findByIdAndDelete(id)
        if (!deletedExpense) {
            return NextResponse.json({ message: "Expense not found" }, { status: 404 })
        }

        return NextResponse.json({ message: "Expense deleted successfully" })
    } catch (error: any) {
        console.error("❌ Delete admin expense error:", error)
        const status = error.message?.includes("Unauthorized") ? 401 : 500
        return NextResponse.json({ message: error.message || "Failed to delete expense" }, { status })
    }
}