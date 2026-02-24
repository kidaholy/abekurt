import { NextResponse } from "next/server"
import mongoose from "mongoose"
import { connectDB } from "@/lib/db"
import Category from "@/lib/models/category"
import { validateSession } from "@/lib/auth"

// DELETE category (Admin only)
export async function DELETE(request: Request, context: any) {
    try {
        const { id } = await context.params
        const decoded = await validateSession(request)
        if (decoded.role !== "admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: "Invalid category ID format" }, { status: 400 })
        }

        const deletedCategory = await Category.findByIdAndDelete(id)

        if (!deletedCategory) {
            return NextResponse.json({ message: "Category not found" }, { status: 404 })
        }

        return NextResponse.json({ message: "Category deleted successfully" })
    } catch (error: any) {
        console.error("❌ Delete category error:", error)
        return NextResponse.json({ message: error.message || "Failed to delete category" }, { status: 500 })
    }
}

// PUT update category (Admin only)
export async function PUT(request: Request, context: any) {
    try {
        const { id } = await context.params
        const decoded = await validateSession(request)
        if (decoded.role !== "admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()

        const body = await request.json()
        const { name } = body

        if (!name) {
            return NextResponse.json({ message: "Name is required" }, { status: 400 })
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { name },
            { new: true }
        )

        if (!updatedCategory) {
            return NextResponse.json({ message: "Category not found" }, { status: 404 })
        }

        return NextResponse.json(updatedCategory)
    } catch (error: any) {
        console.error("❌ Update category error:", error)
        return NextResponse.json({ message: error.message || "Failed to update category" }, { status: 500 })
    }
}
