import { NextResponse } from "next/server"
import mongoose from "mongoose"
import { connectDB } from "@/lib/db"
import MenuItem from "@/lib/models/menu-item"
import Stock from "@/lib/models/stock"
import AuditLog from "@/lib/models/audit-log"
import { validateSession } from "@/lib/auth"


// Update menu item (admin only)
export async function PUT(request: Request, context: any) {
  try {
    console.log("🔄 PUT request received for menu item update")

    const params = await context.params
    console.log("🆔 Raw params:", params)
    console.log("🆔 Params ID:", params.id)
    console.log("🔍 ID type:", typeof params.id)
    console.log("🔍 ID length:", params.id?.length)

    const decoded = await validateSession(request)
    console.log("🔐 Admin updating menu item:", decoded.email || decoded.id)

    if (decoded.role !== "admin") {
      console.log("❌ User is not admin:", decoded.role)
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    console.log("📊 Database connected for menu item update")

    const updateData = await request.json()
    console.log("📝 Menu item update data:", updateData)

    // First check if the item exists
    const existingItem = await MenuItem.findById(params.id)
    if (!existingItem) {
      console.error("❌ Menu item not found in database:", params.id)
      return NextResponse.json({ message: "Menu item not found" }, { status: 404 })
    }

    // Handle menuId update and shifting logic
    if (updateData.menuId && typeof updateData.menuId === 'string' && updateData.menuId.trim() !== existingItem.menuId) {
      const finalMenuId = updateData.menuId.trim()
      updateData.menuId = finalMenuId // Ensure trimmed version is saved

      const oldNumericId = parseInt(existingItem.menuId, 10)
      const newNumericId = parseInt(finalMenuId, 10)

      if (!isNaN(oldNumericId) && !isNaN(newNumericId)) {
        // Find all items except the one we are updating
        const allItems = await MenuItem.find({ _id: { $ne: params.id } }).lean()

        let itemsToShift: any[] = []
        let delta = 0

        if (newNumericId < oldNumericId) {
          // Moving item UP the list (e.g., from 5 to 2)
          // Items from 2 to 4 need to shift DOWN to 3 to 5 (+1)
          itemsToShift = allItems.filter(item => {
            const id = parseInt(item.menuId, 10)
            return !isNaN(id) && id >= newNumericId && id < oldNumericId
          }).sort((a, b) => parseInt(b.menuId, 10) - parseInt(a.menuId, 10)) // Sort desc for +1 shift
          delta = 1
        } else if (newNumericId > oldNumericId) {
          // Moving item DOWN the list (e.g., from 2 to 5)
          // Items from 3 to 5 need to shift UP to 2 to 4 (-1)
          itemsToShift = allItems.filter(item => {
            const id = parseInt(item.menuId, 10)
            return !isNaN(id) && id > oldNumericId && id <= newNumericId
          }).sort((a, b) => parseInt(a.menuId, 10) - parseInt(b.menuId, 10)) // Sort asc for -1 shift
          delta = -1
        }

        if (itemsToShift.length > 0) {
          // Step 1: Shift to unique temporary IDs
          for (const item of itemsToShift) {
            await MenuItem.updateOne(
              { _id: item._id },
              { $set: { menuId: `TEMP_PUT_REORDER_${item._id}_${Date.now()}` } }
            )
          }

          // Step 2: Set to final shifted IDs
          for (const item of itemsToShift) {
            const currentNumericId = parseInt(item.menuId, 10)
            await MenuItem.updateOne(
              { _id: item._id },
              { $set: { menuId: (currentNumericId + delta).toString() } }
            )
          }
        }
      }

      // Log the change
      await AuditLog.create({
        entityType: 'MenuItem',
        entityId: params.id,
        action: 'update',
        field: 'menuId',
        oldValue: existingItem.menuId,
        newValue: updateData.menuId.toString(),
        performedBy: decoded.email || decoded.id,
        timestamp: new Date()
      })
    }

    // Validate ObjectId format using mongoose
    if (!params.id || !mongoose.Types.ObjectId.isValid(params.id)) {
      console.error("❌ Invalid ObjectId format:", params.id)
      console.error("❌ ID type:", typeof params.id)
      console.error("❌ ID length:", params.id?.length)
      console.error("❌ ID value:", JSON.stringify(params.id))
      return NextResponse.json({ message: "Invalid menu item ID format" }, { status: 400 })
    }

    // Convert numeric fields
    if (updateData.price) updateData.price = Number(updateData.price)
    if (updateData.preparationTime) updateData.preparationTime = Number(updateData.preparationTime)
    if (updateData.stockConsumption) updateData.stockConsumption = Number(updateData.stockConsumption)

    // Ensure image field is properly handled (empty string should be saved as empty string, not undefined)
    if (updateData.hasOwnProperty('image')) {
      updateData.image = updateData.image || ""
      console.log("🖼️ Processed image URL:", updateData.image)
    }

    // Handle stock linkage
    if (updateData.stockItemId === "") {
      updateData.stockItemId = null
    }
    if (updateData.stockConsumption) {
      updateData.stockConsumption = Number(updateData.stockConsumption)
    } else if (updateData.stockConsumption === "") {
      updateData.stockConsumption = 0
    }

    // Normalize category if provided
    if (updateData.category) {
      updateData.category = updateData.category.trim().normalize("NFC")
    }

    console.log("🔄 Performing MongoDB update with data:", JSON.stringify(updateData, null, 2))

    const menuItem = await MenuItem.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    )

    if (!menuItem) {
      console.error("❌ Failed to update menu item:", params.id)
      return NextResponse.json({ message: "Menu item not found" }, { status: 404 })
    }

    console.log("✅ Menu item updated successfully:", menuItem._id)
    console.log("🖼️ Updated image URL:", menuItem.image)

    // Verify the update by fetching the item again
    const verificationItem = await MenuItem.findById(params.id)
    console.log("🔍 Verification fetch - Image URL:", verificationItem?.image)

    if (verificationItem?.image !== updateData.image) {
      console.error("⚠️ Image URL mismatch after update!")
      console.error("   Expected:", updateData.image)
      console.error("   Actual:", verificationItem?.image)
    }

    // Return the updated menu item with string ID
    const serializedMenuItem = {
      ...menuItem.toObject(),
      _id: menuItem._id.toString()
    }

    return NextResponse.json({
      message: "Menu item updated successfully",
      menuItem: serializedMenuItem
    })
  } catch (error: any) {
    console.error("❌ Update menu item error:", error)
    return NextResponse.json({ message: error.message || "Failed to update menu item" }, { status: 500 })
  }
}

// Delete menu item (admin only)
export async function DELETE(request: Request, context: any) {
  try {
    const params = await context.params

    const decoded = await validateSession(request)
    console.log("🔐 Admin deleting menu item:", decoded.email || decoded.id)

    if (decoded.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    console.log("📊 Database connected for menu item deletion")
    console.log("🆔 Menu item ID to delete:", params.id)

    // Validate ObjectId format using mongoose
    if (!params.id || !mongoose.Types.ObjectId.isValid(params.id)) {
      console.error("❌ Invalid ObjectId format for deletion:", params.id)
      return NextResponse.json({ message: "Invalid menu item ID format" }, { status: 400 })
    }

    const menuItem = await MenuItem.findByIdAndDelete(params.id)

    if (!menuItem) {
      return NextResponse.json({ message: "Menu item not found" }, { status: 404 })
    }

    const deletedMenuId = parseInt(menuItem.menuId, 10)
    if (!isNaN(deletedMenuId)) {
      // Find all items with numeric menuId > the deleted one
      const allItems = await MenuItem.find({}).lean()
      const itemsToShift = allItems.filter(item => {
        const itemNumericId = parseInt(item.menuId, 10)
        return !isNaN(itemNumericId) && itemNumericId > deletedMenuId
      }).sort((a, b) => parseInt(a.menuId, 10) - parseInt(b.menuId, 10))

      // Shift them down by 1 using a multi-step process to avoid duplicate key errors
      // Step 1: Shift to temporary IDs
      for (const item of itemsToShift) {
        await MenuItem.updateOne(
          { _id: item._id },
          { $set: { menuId: `TEMP_DELETE_SHIFT_${item._id}_${Date.now()}` } }
        )
      }

      // Step 2: Set to final decremented IDs
      for (const item of itemsToShift) {
        const originalNumericId = parseInt(item.menuId, 10)
        await MenuItem.updateOne(
          { _id: item._id },
          { $set: { menuId: (originalNumericId - 1).toString() } }
        )
      }
    }

    console.log("✅ Menu item deleted successfully:", menuItem._id)

    return NextResponse.json({
      message: "Menu item deleted successfully"
    })
  } catch (error: any) {
    console.error("❌ Delete menu item error:", error)
    return NextResponse.json({ message: error.message || "Failed to delete menu item" }, { status: 500 })
  }
}