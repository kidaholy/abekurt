const mongoose = require("mongoose");
require("dotenv").config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

async function migrateData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB!");

    const db = mongoose.connection.db;

    // 1. Migrate Floor collection to Batch collection
    const floors = await db.collection("floors").find({}).toArray();
    console.log(`📌 Found ${floors.length} floors to migrate.`);

    if (floors.length > 0) {
      const batches = floors.map(floor => ({
        _id: floor._id,
        batchNumber: floor.name, // Rename 'name' to 'batchNumber'
        description: floor.description || "",
        order: floor.order || 0,
        isActive: floor.isActive !== undefined ? floor.isActive : true,
        createdAt: floor.createdAt || new Date(),
        updatedAt: floor.updatedAt || new Date()
      }));

      // Insert into batches collection (using insertMany if not exists)
      for (const batch of batches) {
        await db.collection("batches").updateOne(
          { _id: batch._id },
          { $set: batch },
          { upsert: true }
        );
      }
      console.log(`✅ Migrated ${floors.length} floors to batches.`);
    }

    // 2. Update Tables: rename floorId to batchId
    const tableUpdateResult = await db.collection("tables").updateMany(
      { floorId: { $exists: true } },
      [
        {
          $set: {
            batchId: "$floorId"
          }
        },
        {
          $unset: "floorId"
        }
      ]
    );
    console.log(`✅ Updated ${tableUpdateResult.modifiedCount} tables (renamed floorId to batchId).`);

    // 3. Update Users: rename floorId to batchId
    const userUpdateResult = await db.collection("users").updateMany(
      { floorId: { $exists: true } },
      [
        {
          $set: {
            batchId: "$floorId"
          }
        },
        {
          $unset: "floorId"
        }
      ]
    );
    console.log(`✅ Updated ${userUpdateResult.modifiedCount} users (renamed floorId to batchId).`);

    // 4. Update Orders: rename floorId to batchId and floorName to batchNumber
    const orderUpdateResult = await db.collection("orders").updateMany(
      { $or: [{ floorId: { $exists: true } }, { floorName: { $exists: true } }] },
      [
        {
          $set: {
            batchId: "$floorId",
            batchNumber: "$floorName"
          }
        },
        {
          $unset: ["floorId", "floorName"]
        }
      ]
    );
    console.log(`✅ Updated ${orderUpdateResult.modifiedCount} orders (migrated floor fields to batch fields).`);

    console.log("✨ Data migration complete!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected.");
  }
}

migrateData();
