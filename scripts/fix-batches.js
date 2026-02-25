const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

async function fix() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        
        // Fix Batches
        const result = await db.collection('batches').updateMany(
            {},
            { $set: { isActive: true, status: "active" } }
        );
        console.log(`Updated ${result.modifiedCount} batches.`);
        
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
fix();
