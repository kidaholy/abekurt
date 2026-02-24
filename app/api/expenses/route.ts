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
        const period = searchParams.get("period") || "today"

        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
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
            // Period-based query
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
            }

            query.date = { $gte: startDate, $lte: endDate }
        }

        const expenses = await DailyExpense.find(query).sort({ date: -1 }).lean()

        // Convert ObjectId to string for frontend compatibility
        const serializedExpenses = expenses.map(expense => ({
            ...expense,
            _id: expense._id.toString()
        }))

        return NextResponse.json(serializedExpenses)
    } catch (error: any) {
        console.error("❌ Get expenses error:", error)
        const status = error.message?.includes("Unauthorized") ? 401 : 500
        return NextResponse.json({ message: error.message || "Failed to get expenses" }, { status })
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
        console.error("❌ Delete expense error:", error)
        return NextResponse.json({ message: error.message || "Failed to delete expense" }, { status: 500 })
    }
}

// POST create/update daily expense
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

        const expenseData = {
            date: expenseDate,
            otherExpenses: otherExpenses || 0,
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

        // Update stock quantities based on purchases
        if (items && items.length > 0) {
            for (const item of items) {
                if (item.quantity > 0) {
                    await Stock.findOneAndUpdate(
                        { name: { $regex: new RegExp(`^${item.name}`, 'i') } },
                        { $inc: { quantity: item.quantity } }
                    )
                }
            }
        }

        const serializedExpense = {
            ...expense.toObject(),
            _id: expense._id.toString()
        }

        return NextResponse.json(serializedExpense, { status: existingExpense ? 200 : 201 })
    } catch (error: any) {
        console.error("❌ Create/Update expense error:", error)
        const status = error.message?.includes("Unauthorized") ? 401 : 500
        return NextResponse.json({ message: error.message || "Failed to save expense" }, { status })
    }
}