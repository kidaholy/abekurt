import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import OperationalExpense from "@/lib/models/operational-expense"
import { validateSession } from "@/lib/auth"

// GET operational expenses
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const date = searchParams.get("date")
        const period = searchParams.get("period") || "month"

        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()

        let query: any = {}

        if (date) {
            const targetDate = new Date(date)
            targetDate.setUTCHours(0, 0, 0, 0)
            query.date = targetDate
        } else if (period !== "all") {
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

        const expenses = await OperationalExpense.find(query).sort({ date: -1 }).lean()
        return NextResponse.json(expenses)
    } catch (error: any) {
        console.error("❌ Get operational expenses error:", error)
        return NextResponse.json({ message: error.message || "Failed to get expenses" }, { status: 500 })
    }
}

// POST create/update operational expense
export async function POST(request: Request) {
    try {
        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()

        const body = await request.json()
        const { _id, date, category, amount, description } = body

        if (!date || !category || amount === undefined) {
            return NextResponse.json({ message: "Date, category, and amount are required" }, { status: 400 })
        }

        const expenseData = {
            date: new Date(date),
            category,
            amount: Number(amount),
            description: description || ""
        }

        let expense
        if (_id) {
            expense = await OperationalExpense.findByIdAndUpdate(_id, expenseData, { new: true, runValidators: true })
        } else {
            expense = await OperationalExpense.create(expenseData)
        }

        return NextResponse.json(expense, { status: _id ? 200 : 201 })
    } catch (error: any) {
        console.error("❌ Save operational expense error:", error)
        return NextResponse.json({ message: error.message || "Failed to save expense" }, { status: 500 })
    }
}

// DELETE operational expense
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

        const deletedExpense = await OperationalExpense.findByIdAndDelete(id)
        if (!deletedExpense) {
            return NextResponse.json({ message: "Expense not found" }, { status: 404 })
        }

        return NextResponse.json({ message: "Expense deleted successfully" })
    } catch (error: any) {
        console.error("❌ Delete operational expense error:", error)
        return NextResponse.json({ message: error.message || "Failed to delete expense" }, { status: 500 })
    }
}
