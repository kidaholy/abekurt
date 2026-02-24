import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import MenuItem from "@/lib/models/menu-item"
import Stock from "@/lib/models/stock"
import { validateSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const decoded = await validateSession(request)

    await connectDB()
    // Force Stock model registration by using it
    console.log("Database connected for menu retrieval", Stock.modelName)
    const menuItems = await MenuItem.find({ available: true })
      .populate('stockItemId')
      .lean()

    // Filter out items where linked stock is finished
    const filteredItems = menuItems.filter((item: any) => {
      if (item.stockItemId && item.stockItemId.status === 'finished') {
        return false
      }
      return true
    })

    // Convert ObjectId to string for frontend compatibility
    const serializedItems = filteredItems.map((item: any) => ({
      ...item,
      _id: item._id.toString(),
      stockItemId: item.stockItemId
        ? (typeof item.stockItemId === 'object' && '_id' in item.stockItemId
          ? item.stockItemId._id.toString()
          : item.stockItemId.toString())
        : null
    })).sort((a: any, b: any) => {
      const idA = a.menuId || ""
      const idB = b.menuId || ""
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' })
    })

    return NextResponse.json(serializedItems)
  } catch (error: any) {
    console.error("Get menu error:", error)
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: error.message || "Failed to get menu" }, { status })
  }
}
