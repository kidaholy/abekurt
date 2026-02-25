const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

async function migrate() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const tablesCollection = db.collection('tables');
        const ordersCollection = db.collection('orders');

        // 1. Get all tables
        const allTables = await tablesCollection.find({}).toArray();
        console.log(`Found ${allTables.length} total tables`);

        // 2. Group by tableNumber
        const groups = {};
        allTables.forEach(t => {
            if (!groups[t.tableNumber]) groups[t.tableNumber] = [];
            groups[t.tableNumber].push(t);
        });

        console.log(`Unique table numbers: ${Object.keys(groups).length}`);

        for (const [number, tables] of Object.entries(groups)) {
            console.log(`Processing Table ${number}...`);

            // Pick the first as master
            const master = tables[0];
            const slaves = tables.slice(1);

            if (slaves.length > 0) {
                const slaveIds = slaves.map(s => s._id);
                console.log(`  Merging ${slaves.length} duplicates into Master (${master._id})`);

                // Update orders pointing to slave IDs
                const orderUpdate = await ordersCollection.updateMany(
                    { tableId: { $in: slaveIds } },
                    { $set: { tableId: master._id } }
                );
                console.log(`  Updated ${orderUpdate.modifiedCount} orders`);

                // Delete slave tables
                const deleteResult = await tablesCollection.deleteMany({ _id: { $in: slaveIds } });
                console.log(`  Deleted ${deleteResult.deletedCount} duplicate tables`);
            }

            // Ensure master table doesn't have a batchId (cleanup DB documents)
            await tablesCollection.updateOne(
                { _id: master._id },
                { $unset: { batchId: "" } }
            );
        }

        // 3. Final cleanup - remove batchId from any table that somehow escaped
        const finalCleanup = await tablesCollection.updateMany(
            { batchId: { $exists: true } },
            { $unset: { batchId: "" } }
        );
        console.log(`Final cleanup: removed batchId from ${finalCleanup.modifiedCount} documents`);

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
