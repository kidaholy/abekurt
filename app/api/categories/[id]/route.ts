import { NextResponse } from "next/server"
import mongoose from "mongoose"
import { connectDB } from "@/lib/db"
import Category from "@/lib/models/category"
import MenuItem from "@/lib/models/menu-item"
import Stock from "@/lib/models/stock"
import FixedAsset from "@/lib/models/fixed-asset"
import OperationalExpense from "@/lib/models/operational-expense"
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

        const categoryToDelete = await Category.findById(id)
        if (!categoryToDelete) {
            return NextResponse.json({ message: "Category not found" }, { status: 404 })
        }

        const { name: oldName, type } = categoryToDelete
        await Category.findByIdAndDelete(id)

        // Sync items - set to default/Uncategorized
        const newCategoryName = type === 'fixed-asset' ? 'General' : 'Uncategorized'
        
        if (type === 'menu') {
            await MenuItem.updateMany({ category: oldName }, { category: newCategoryName })
        } else if (type === 'stock') {
            await Stock.updateMany({ category: oldName }, { category: newCategoryName })
        } else if (type === 'fixed-asset') {
            await FixedAsset.updateMany({ category: oldName }, { category: newCategoryName })
        } else if (type === 'expense') {
            await OperationalExpense.updateMany({ category: oldName }, { category: newCategoryName })
        }

        return NextResponse.json({ message: "Category deleted and items updated successfully" })
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

        const oldCategory = await Category.findById(id)
        if (!oldCategory) {
            return NextResponse.json({ message: "Category not found" }, { status: 404 })
        }

        const oldName = oldCategory.name
        const type = oldCategory.type
        const newName = name.trim().normalize("NFC")

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { name: newName },
            { new: true }
        )

        // Sync items if name changed
        if (oldName !== newName) {
            if (type === 'menu') {
                await MenuItem.updateMany({ category: oldName }, { category: newName })
            } else if (type === 'stock') {
                await Stock.updateMany({ category: oldName }, { category: newName })
            } else if (type === 'fixed-asset') {
                await FixedAsset.updateMany({ category: oldName }, { category: newName })
            } else if (type === 'expense') {
                await OperationalExpense.updateMany({ category: oldName }, { category: newName })
            }
        }

        return NextResponse.json(updatedCategory)
    } catch (error: any) {
        console.error("❌ Update category error:", error)
        return NextResponse.json({ message: error.message || "Failed to update category" }, { status: 500 })
    }
}
