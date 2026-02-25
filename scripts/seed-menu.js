const mongoose = require("mongoose");
const fs = require("fs");
require("dotenv").config({ path: ".env" });

const MenuItemSchema = new mongoose.Schema({}, { strict: false });
const MenuItem = mongoose.models.MenuItem || mongoose.model("MenuItem", MenuItemSchema, "menuitems");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://kidayos2014:holyunion@cluster0.pxcpi49.mongodb.net/abekurt";

async function seedMenu() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB!");

    // Read the file content as a string
    const rawData = fs.readFileSync("menu-data.json", "utf8");
    
    // The user pasted a potentially truncated or malformed JSON array due to the character limit.
    // Let's try to extract valid JSON objects from it using regex, bypassing strict JSON.parse errors
    // on the whole array if it's missing a closing bracket.
    
    console.log("Extracting JSON objects...");
    const objectRegex = /\{[^{}]*("_id"[^{}]*\}|"(?:[^"\\]|\\.)*"(?:\s*:\s*(?:"(?:[^"\\]|\\.)*"|[^{}]*))?)*\}/g;
    
    let match;
    const extractedData = [];
    let errorCount = 0;

    while ((match = objectRegex.exec(rawData)) !== null) {
      try {
          const item = JSON.parse(match[0]);
          if(item.name && item.price) {
             extractedData.push(item);
          }
      } catch(e) {
          errorCount++;
      }
    }
    
    console.log(`Successfully extracted ${extractedData.length} valid menu items (failed to parse ${errorCount} fragments).`);

    const formattedData = extractedData.map((item) => {
      const formattedItem = { ...item };
      
      if (item._id && item._id.$oid) {
        formattedItem._id = new mongoose.Types.ObjectId(item._id.$oid);
      } else if (item._id && typeof item._id === 'object' && item._id.toString) {
         try { formattedItem._id = new mongoose.Types.ObjectId(item._id.toString()); } catch(e){}
      }

      if (item.createdAt && item.createdAt.$date) {
        formattedItem.createdAt = new Date(item.createdAt.$date);
      }
      if (item.updatedAt && item.updatedAt.$date) {
        formattedItem.updatedAt = new Date(item.updatedAt.$date);
      }
      
      if (item.stockItemId && item.stockItemId.$oid) {
        formattedItem.stockItemId = new mongoose.Types.ObjectId(item.stockItemId.$oid);
      }

      return formattedItem;
    });

    if (formattedData.length > 0) {
        // Use bulkWrite for safer upserts based on menuId or _id to avoid duplicates if run multiple times
        console.log("Upserting items to database...");
        const ops = formattedData.map(item => ({
            updateOne: {
                filter: { _id: item._id },
                update: { $set: item },
                upsert: true
            }
        }));
        
        const result = await MenuItem.bulkWrite(ops);
        console.log(`Success! Inserted ${result.upsertedCount}, Modified ${result.modifiedCount}.`);
    } else {
        console.log("No valid items found to insert.");
    }

  } catch (error) {
    console.error("Critical error seeding menu data:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

seedMenu();
