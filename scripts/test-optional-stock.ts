import "dotenv/config"
import mongoose from "mongoose"
import { connectDB } from "../lib/db"
import MenuItem from "../lib/models/menu-item"

async function testOptionalStockLink() {
    try {
        await connectDB()
        console.log("Connected to database")

        // 1. Attempt to create a menu item with NO recipe and NO stockItemId
        const testItemName = "Optional Stock Item " + Date.now()
        const testItem = new MenuItem({
            menuId: "TEST_OPTIONAL_" + Date.now(),
            name: testItemName,
            mainCategory: "Food",
            category: "Bakery",
            price: 5,
            available: true,
            recipe: [] // Empty recipe
            // stockItemId is omitted
        })

        await testItem.save()
        console.log(`✅ SUCCESS: Created menu item without stock link: ${testItemName}`)

        // 2. Verify it can be retrieved
        const retrievedItem = await MenuItem.findById(testItem._id)
        if (retrievedItem && retrievedItem.recipe.length === 0 && !retrievedItem.stockItemId) {
            console.log("✅ VERIFIED: Item exists in DB with no stock links.")
        } else {
            console.error("❌ FAILURE: Item state in DB is incorrect.")
        }

        // Cleanup
        await MenuItem.findByIdAndDelete(testItem._id)
        console.log("Cleaned up test data")

    } catch (error) {
        console.error("❌ TEST FAILED:", error.message)
    } finally {
        await mongoose.disconnect()
    }
}

testOptionalStockLink()
