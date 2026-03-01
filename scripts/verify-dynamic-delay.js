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

async function verify() {
    try {
        await mongoose.connect(MONGODB_URI);
        const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({
            orderNumber: String,
            status: String,
            createdAt: Date,
            servedAt: Date,
            delayMinutes: Number,
            thresholdMinutes: Number,
            totalAmount: Number,
            tableNumber: String,
            items: Array
        }, { timestamps: true }));

        const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', new mongoose.Schema({
            menuId: String,
            menuItemId: String,
            name: String,
            preparationTime: Number
        }));

        // 1. Find or create a menu item with a specific prep time
        let testMenuItem = await MenuItem.findOne({ menuItemId: 'TEST-ITEM' });
        if (!testMenuItem) {
            testMenuItem = await MenuItem.create({
                menuId: 'T1',
                menuItemId: 'TEST-ITEM',
                name: 'Test Dynamic Item',
                preparationTime: 15
            });
        } else {
            testMenuItem.preparationTime = 15;
            await testMenuItem.save();
        }
        console.log(`✅ Menu Item preparationTime: ${testMenuItem.preparationTime}m`);

        // 2. Create a fake order from "20 minutes ago"
        // This should trigger an alert because 20m > 15m (prep time)
        const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
        
        const testOrder = await Order.create({
            orderNumber: 'DYN-TEST-' + Math.floor(Math.random() * 1000),
            status: 'preparing',
            createdAt: twentyMinsAgo,
            totalAmount: 100,
            tableNumber: 'TEST-1',
            items: [{ menuItemId: 'TEST-ITEM', name: 'Test Dynamic Item', quantity: 1, price: 100 }]
        });
        console.log(`✅ Created test order #${testOrder.orderNumber}`);

        // 3. Simulate API logic
        const servedAt = new Date();
        const delayMs = servedAt.getTime() - twentyMinsAgo.getTime();
        const delayMinutes = Math.floor(delayMs / 60000);
        
        const menuItems = await MenuItem.find({ menuItemId: { $in: ['TEST-ITEM'] } }).lean();
        const itemPrepTimes = menuItems.map(mi => mi.preparationTime || 0);
        const maxPrepTime = Math.max(...itemPrepTimes);
        const dynamicThreshold = maxPrepTime > 0 ? maxPrepTime : 20;

        console.log(`🧮 Result: Delay: ${delayMinutes}m, Dynamic Threshold: ${dynamicThreshold}m`);
        
        if (delayMinutes > dynamicThreshold) {
            console.log('🔔 SUCCESS: Delay alert would be triggered (Delay > Dynamic Threshold)');
        } else {
            console.log('❌ FAILURE: Delay alert would NOT be triggered');
        }

        // Cleanup
        await Order.findByIdAndDelete(testOrder._id);
        await MenuItem.deleteOne({ menuItemId: 'TEST-ITEM' });
        console.log('🗑️ Cleaned up test data.');

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
verify();
