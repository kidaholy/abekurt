import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { join } from "path";

// Load .env.local
dotenv.config({ path: join(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not defined in .env.local");
    process.exit(1);
}

async function updateIndexes() {
    try {
        console.log("🔄 Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI!);
        console.log("✅ Connected.");

        const db = mongoose.connection.db;
        const collection = db!.collection("tables");

        console.log("🔍 Current indexes:");
        const indexes = await collection.indexes();
        console.log(JSON.stringify(indexes, null, 2));

        // Check for the old unique index on tableNumber_floorId
        const oldIndex = indexes.find(idx => idx.name === "tableNumber_1_floorId_1" || idx.name === "tableNumber_1_batchId_1");

        if (oldIndex) {
            console.log(`🗑️ Dropping old unique index: ${oldIndex.name}`);
            await collection.dropIndex(oldIndex.name!);
            console.log("✅ Dropped.");
        } else {
            console.log("ℹ️ Old unique index not found.");
        }

        console.log("✨ Creating new unique index: { tableNumber: 1 }");
        await collection.createIndex({ tableNumber: 1 }, { unique: true, name: "tableNumber_1" });
        console.log("✅ Created.");
        console.log("✅ Created.");

        console.log("🔍 Final indexes:");
        const finalIndexes = await collection.indexes();
        console.log(JSON.stringify(finalIndexes, null, 2));

        await mongoose.disconnect();
        console.log("👋 Done.");
    } catch (error) {
        console.error("❌ Error updating indexes:", error);
        process.exit(1);
    }
}

updateIndexes();
