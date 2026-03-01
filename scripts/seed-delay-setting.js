const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config({ path: '.env' });

// Fix for DNS resolution issues with MongoDB Atlas
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
    console.warn("⚠️ Failed to set global DNS servers:", e);
}

const MONGODB_URI = process.env.MONGODB_URI;

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        const Settings = mongoose.models.Settings || mongoose.model('Settings', new mongoose.Schema({
            key: { type: String, required: true, unique: true },
            value: { type: String, required: true },
            type: { type: String, default: 'string' },
            description: { type: String }
        }, { timestamps: true }));

        const thresholdKey = 'PREPARATION_TIME_THRESHOLD';
        const existing = await Settings.findOne({ key: thresholdKey });

        if (!existing) {
            await Settings.create({
                key: thresholdKey,
                value: '20',
                type: 'number',
                description: 'Standard preparation time threshold in minutes before notifying admin of delays.'
            });
            console.log('✅ Created PREPARATION_TIME_THRESHOLD setting (default: 20m)');
        } else {
            console.log('📌 PREPARATION_TIME_THRESHOLD setting already exists.');
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
seed();
