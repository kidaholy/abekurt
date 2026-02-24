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

        const { menuId1, menuId2 } = await request.json()

        if (!menuId1 || !menuId2) {
            return NextResponse.json({ message: "Both Menu IDs are required" }, { status: 400 })
        }

        // Find the two items
        const item1 = await MenuItem.findOne({ menuId: menuId1 })
        const item2 = await MenuItem.findOne({ menuId: menuId2 })

        if (!item1 || !item2) {
            return NextResponse.json({ message: "One or both items not found" }, { status: 404 })
        }

        // Swap IDs safely using a temporary ID
        // Step 1: Set item1 to temp
        const tempId = `TEMP_SWAP_${Date.now()}`

        await MenuItem.updateOne({ _id: item1._id }, { $set: { menuId: tempId } })

        // Step 2: Set item2 to item1's original ID
        await MenuItem.updateOne({ _id: item2._id }, { $set: { menuId: menuId1 } })

        // Step 3: Set item1 (now temp) to item2's original ID
        await MenuItem.updateOne({ _id: item1._id }, { $set: { menuId: menuId2 } })

        console.log(`✅ Swapped Menu IDs: ${menuId1} <-> ${menuId2}`)

        return NextResponse.json({ message: "IDs swapped successfully" })
    } catch (error: any) {
        console.error("Swap IDs error:", error)
        return NextResponse.json({ message: error.message || "Failed to swap IDs" }, { status: 500 })
    }
}
