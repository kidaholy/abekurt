import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Category from "@/lib/models/category"
import { validateSession } from "@/lib/auth"

// GET categories by type
export async function GET(request: Request) {
    try {
        await validateSession(request)
        const { searchParams } = new URL(request.url)
        const type = searchParams.get("type")

        await connectDB()

        const query = type ? { type } : {}
        const categories = await Category.find(query).sort({ name: 1 }).lean()

        return NextResponse.json(categories)
    } catch (error: any) {
        console.error("❌ Get categories error:", error)
        const status = error.message?.includes("Unauthorized") ? 401 : 500
        return NextResponse.json({ message: error.message || "Failed to get categories" }, { status })
    }
}

// POST create new category (Admin only)
export async function POST(request: Request) {
    try {
        const decoded = await validateSession(request)
        if (decoded.role !== "admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()

        const body = await request.json()
        const { name, type, description } = body

        if (!name || !type) {
            return NextResponse.json({ message: "Name and type are required" }, { status: 400 })
        }

        const newCategory = new Category({
            name: name.trim().normalize("NFC"),
            type,
            description: description?.trim()
        })
        await newCategory.save()

        return NextResponse.json(newCategory, { status: 201 })
    } catch (error: any) {
        console.error("❌ Create category error:", error)
        const status = error.message?.includes("Unauthorized") ? 401 : 500
        return NextResponse.json({ message: error.message || "Failed to create category" }, { status })
    }
}
