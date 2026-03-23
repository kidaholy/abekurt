import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import MenuItem from "@/lib/models/menu-item"
import Stock from "@/lib/models/stock"
import { validateSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const decoded = await validateSession(request)

    const { searchParams } = new URL(request.url)
    const fetchAll = searchParams.get('all') === 'true'

    await connectDB()
    // Force Stock model registration by using it
    console.log("Database connected for menu retrieval", Stock.modelName)

    // Prepare query based on 'all' flag
    const query = fetchAll ? {} : { available: true }

    const menuItems = await MenuItem.find(query)
      .populate('stockItemId')
      .populate('recipe.stockItemId')
      .lean()

    // Filter out items where linked stock or any recipe ingredient is out of stock (unless fetchAll is true)
    const filteredItems = menuItems.filter((item: any) => {
      if (fetchAll) return true

      // 1. Check Legacy Stock Item
      if (item.stockItemId) {
        const status = item.stockItemId.status
        const qty = item.stockItemId.quantity || 0
        if (status === 'finished' || status === 'out_of_stock' || qty <= 0) {
          return false
        }
      }

      // 2. Check Recipe Ingredients
      if (item.recipe && item.recipe.length > 0) {
        for (const ingredient of item.recipe) {
          const stock = ingredient.stockItemId
          if (stock) {
            const status = stock.status
            const qty = stock.quantity || 0
            const required = ingredient.quantityRequired || 0
            
            if (status === 'finished' || status === 'out_of_stock' || qty < required) {
              return false
            }
          }
        }
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
