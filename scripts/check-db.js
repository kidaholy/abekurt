const mongoose = require('mongoose');
const dns = require('dns');

// Fix for DNS resolution issues with MongoDB Atlas
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
    console.log("🌐 Global DNS servers set to Google DNS (8.8.8.8, 8.8.4.4)");
} catch (e) {
    console.warn("⚠️ Failed to set global DNS servers:", e);
}

require('dotenv').config({ path: '.env' });


const MONGODB_URI = process.env.MONGODB_URI;

async function check() {
    try {
        await mongoose.connect(MONGODB_URI);
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log('Collections:');
        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(` - ${col.name}: ${count} documents`);
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
check();
