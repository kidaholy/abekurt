import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import MenuItem from "@/lib/models/menu-item"
import Stock from "@/lib/models/stock"
import { validateSession } from "@/lib/auth"

// Get all menu items (admin only)
export async function GET(request: Request) {
  try {
    const decoded = await validateSession(request)
    console.log("📋 Admin fetching menu items:", decoded.email || decoded.id)

    if (decoded.role !== "admin" && decoded.role !== "super-admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    console.log("📊 Database connected for menu retrieval")

    const menuItems = await MenuItem.find({}).populate("stockItemId", "name unit status").lean()
    console.log(`🍽️ Found ${menuItems.length} menu items in database`)

    // Convert ObjectId to string for frontend compatibility
    const serializedItems = menuItems.map(item => ({
      ...item,
      _id: item._id.toString()
    })).sort((a: any, b: any) => {
      const idA = a.menuId || ""
      const idB = b.menuId || ""
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' })
    })

    return NextResponse.json(serializedItems)
  } catch (error: any) {
    console.error("❌ Get menu items error:", error)
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: error.message || "Failed to get menu items" }, { status })
  }
}

// Create new menu item (admin only)
export async function POST(request: Request) {
  try {
    const decoded = await validateSession(request)
    console.log("🔐 Admin creating menu item:", decoded.email || decoded.id)

    if (decoded.role !== "admin" && decoded.role !== "super-admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    console.log("📊 Database connected for menu item creation")

    const { menuId, name, category, price, description, image, preparationTime, available, stockItemId, stockConsumption } = await request.json()
    console.log("📝 Menu item data received:", { menuId, name, category, price, stockItemId })

    if (!name || !category || !price) {
      return NextResponse.json({ message: "Name, category, and price are required" }, { status: 400 })
    }

    // Check if menuId is provided, if not auto-generate
    let finalMenuId = menuId ? menuId.toString().trim() : ""
    if (!finalMenuId) {
      // Find the items and extract the highest number
      const allItems = await MenuItem.find({}, { menuId: 1 }).lean()
      let maxId = 0

      allItems.forEach((item: any) => {
        if (item.menuId) {
          const match = item.menuId.match(/\d+/)
          if (match) {
            const num = parseInt(match[0], 10)
            if (num > maxId) maxId = num
          }
        }
      })

      finalMenuId = (maxId + 1).toString()
    }

    // Logic for shifting IDs: When an ID is specified (or auto-gen), 
    // any existing items with numeric ID >= finalMenuId will be incremented.
    const numericId = parseInt(finalMenuId, 10)
    if (!isNaN(numericId)) {
      // Find all menu items, sort them by numeric menuId
      const allItems = await MenuItem.find({}).lean()

      // Get all items that need to be shifted (>= numericId)
      // Sort in DESCENDING order so we process higher IDs first (safest)
      const itemsToShift = allItems.filter(item => {
        const itemNumericId = parseInt(item.menuId, 10)
        return !isNaN(itemNumericId) && itemNumericId >= numericId
      }).sort((a, b) => parseInt(b.menuId, 10) - parseInt(a.menuId, 10))

      // Multi-step shift process to avoid duplicate key errors (index: menuId_1)
      // Step 1: Shift everything to unique temporary IDs
      for (const item of itemsToShift) {
        await MenuItem.updateOne(
          { _id: item._id },
          { $set: { menuId: `TEMP_POST_${item._id}_${Date.now()}` } }
        )
      }

      // Step 2: Assign new numeric IDs (original + 1)
      // We use the original numeric ID collected before the temporary rename
      for (const item of itemsToShift) {
        const originalNumericId = parseInt(item.menuId, 10)
        await MenuItem.updateOne(
          { _id: item._id },
          { $set: { menuId: (originalNumericId + 1).toString() } }
        )
      }
    }

    // Create menu item
    const menuItem = new MenuItem({
      menuId: finalMenuId,
      name: name.trim(),
      category: category.trim().normalize("NFC"),
      price: Number(price),
      description,
      image,
      preparationTime: preparationTime ? Number(preparationTime) : 10,
      available: available !== false,
      stockItemId: stockItemId || null,
      stockConsumption: stockConsumption ? Number(stockConsumption) : 0,
    })
    await menuItem.save()

    console.log("✅ Menu item created successfully:", menuItem._id)

    return NextResponse.json({
      message: "Menu item created successfully",
      menuItem
    })
  } catch (error: any) {
    console.error("❌ Create menu item error:", error)
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: error.message || "Failed to create menu item" }, { status })
  }
}