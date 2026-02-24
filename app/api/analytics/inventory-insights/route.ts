import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Order from "@/lib/models/order"
import Stock from "@/lib/models/stock"
import { validateSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const decoded = await validateSession(request)
    await connectDB()

    // Inventory insights
    const allStock = await Stock.find().lean()

    const lowStockItems = allStock.filter(item =>
      item.trackQuantity &&
      item.minLimit &&
      (item.quantity || 0) <= (item.minLimit || 0)
    )

    const inventoryValue = allStock.reduce((sum, item) => {
      if (item.trackQuantity && item.quantity && item.unitCost) {
        return sum + (item.quantity * item.unitCost)
      }
      return sum
    }, 0)

    const insights = {
      totalItems: allStock.length,
      lowStockCount: lowStockItems.length,
      inventoryValue,
      lowStockItems: lowStockItems.map(item => ({
        name: item.name,
        current: item.quantity || 0,
        minimum: item.minLimit || 0,
        unit: item.unit || ''
      }))
    }

    return NextResponse.json(insights)
  } catch (error: any) {
    console.error("Inventory insights error:", error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}