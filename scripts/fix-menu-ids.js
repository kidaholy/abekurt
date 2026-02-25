const mongoose = require("mongoose");
require("dotenv").config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;
const MenuItemSchema = new mongoose.Schema({}, { strict: false });
const MenuItem = mongoose.models.MenuItem || mongoose.model("MenuItem", MenuItemSchema, "menuitems");

async function fixMenuIds() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB!");

    // Find any menu items with a 'TEMP_' menuId
    const corruptedItems = await MenuItem.find({ menuId: { $regex: /^TEMP_/ } });
    
    console.log(`Found ${corruptedItems.length} corrupted menu items.`);
    
    if (corruptedItems.length > 0) {
      console.log("Corrupted Items:", corruptedItems.map(item => ({ _id: item._id, name: item.name, currentMenuId: item.menuId })));
      
      // Let's find the max normal numeric menuId to know where to append them
      const allItems = await MenuItem.find({});
      
      let maxId = 0;
      for (const item of allItems) {
         if (item.menuId && !item.menuId.startsWith("TEMP_")) {
             const num = parseInt(item.menuId, 10);
             if (!isNaN(num) && num > maxId) {
                 maxId = num;
             }
         }
      }
      
      console.log(`Current highest valid menuId is ${maxId}. Resetting corrupted items sequentially after this.`);
      
      for (const item of corruptedItems) {
         maxId++;
         await MenuItem.updateOne(
             { _id: item._id },
             { $set: { menuId: maxId.toString() } }
         );
         console.log(`Updated item '${item.name}' to menuId '${maxId}'`);
      }
      
      console.log("Cleanup complete!");
    } else {
      console.log("No corrupted items found. Database looks clean.");
    }

  } catch (error) {
    console.error("Error connecting or updating:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

fixMenuIds();
