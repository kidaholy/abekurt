import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import MenuItem from "@/lib/models/menu-item"
import { validateSession } from "@/lib/auth"

export async function POST(request: Request) {
    try {
        const decoded = await validateSession(request)

        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()

        // 1. Get all menu items
        const menuItems = await MenuItem.find({}).lean()

        // 2. Sort them numerically by current menuId
        const sortedItems = [...menuItems].sort((a, b) => {
            const idA = parseInt(a.menuId, 10) || 0
            const idB = parseInt(b.menuId, 10) || 0

            // If menuId is something weird like a string, fallback to string comparison
            if (isNaN(idA) || isNaN(idB)) {
                return a.menuId.localeCompare(b.menuId, undefined, { numeric: true })
            }
            return idA - idB
        })

        // 3. Re-index them sequentially using a two-step process to avoid duplicate key errors
        // Step 1: Shift everything to unique temporary IDs
        for (let i = 0; i < sortedItems.length; i++) {
            const item = sortedItems[i]
            await MenuItem.updateOne(
                { _id: item._id },
                { $set: { menuId: `TEMP_NORM_${item._id}_${Date.now()}` } }
            )
        }

        // Step 2: Assign sequential IDs starting from 1
        for (let i = 0; i < sortedItems.length; i++) {
            const item = sortedItems[i]
            const sequentialId = (i + 1).toString()
            await MenuItem.updateOne(
                { _id: item._id },
                { $set: { menuId: sequentialId } }
            )
        }

        return NextResponse.json({
            message: "Menu IDs normalized successfully",
            count: sortedItems.length
        })
    } catch (error: any) {
        console.error("Normalize menu IDs error:", error)
        return NextResponse.json({ message: error.message || "Failed to normalize menu IDs" }, { status: 500 })
    }
}
