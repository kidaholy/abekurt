import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import MenuItem from "@/lib/models/menu-item"
import Stock from "@/lib/models/stock"

// Public endpoint — no authentication required
export async function GET() {
  try {
    await connectDB()
    // Force Stock model registration
    console.log("Public menu fetch", Stock.modelName)

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

    // Serialize for frontend
    const serializedItems = filteredItems.map((item: any) => ({
      _id: item._id.toString(),
      menuId: item.menuId,
      name: item.name,
      mainCategory: item.mainCategory || 'Food',
      category: item.category,
      price: item.price,
      description: item.description,
      image: item.image,
      preparationTime: item.preparationTime,
    })).sort((a: any, b: any) => {
      const idA = a.menuId || ""
      const idB = b.menuId || ""
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' })
    })

    return NextResponse.json(serializedItems)
  } catch (error: any) {
    console.error("Public menu error:", error)
    return NextResponse.json({ message: "Failed to load menu" }, { status: 500 })
  }
}
