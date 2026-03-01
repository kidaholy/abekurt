
require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

// Fix for DNS resolution issues with MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  console.log("🌐 Global DNS servers set to Google DNS (8.8.8.8, 8.8.4.4)");
} catch (e) {
  console.warn("⚠️ Failed to set global DNS servers:", e);
}

async function checkOrders() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not found in .env');
    
    console.log('Connecting to Atlas...');
    await mongoose.connect(uri);
    console.log('Connected successfully');

    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
    
    // Find recent served/completed orders
    const orders = await Order.find({ 
      status: { $in: ['served', 'completed'] },
      isDeleted: { $ne: true }
    }).sort({ createdAt: -1 }).limit(10);

    console.log(`--- Found ${orders.length} Served/Completed Orders ---`);
    orders.forEach(o => {
      console.log(`Order #: ${o.orderNumber}`);
      console.log(`Status: ${o.status}`);
      console.log(`CreatedAt: ${o.createdAt}`);
      console.log(`ServedAt: ${o.servedAt}`);
      console.log(`ReadyAt: ${o.readyAt}`);
      console.log(`TotalPrep: ${o.totalPreparationTime}`);
      console.log(`DelayMins: ${o.delayMinutes}`);
      console.log(`Threshold: ${o.thresholdMinutes}`);
      
      const threshold = o.thresholdMinutes || 20;
      const start = new Date(o.createdAt).getTime();
      
      // Simulation of current "Faulty" logic in frontend
      const endFaulty = new Date(o.servedAt || o.readyAt || o.createdAt).getTime();
      const totalTakenFaulty = Math.floor((endFaulty - start) / 60000);
      const delayFaulty = Math.max(0, totalTakenFaulty - threshold);

      // Simulation of "Correct" logic (if servedAt is missing, use now() for research)
      const endRealIfMissing = o.servedAt ? new Date(o.servedAt).getTime() : Date.now();
      const totalTakenReal = Math.floor((endRealIfMissing - start) / 60000);
      const delayReal = Math.max(0, totalTakenReal - threshold);
      
      console.log(`FRONTEND LOGIC -> Total: ${totalTakenFaulty}m, Delay: ${delayFaulty}m -> ${delayFaulty > 0 ? 'DELAY' : 'ON TIME'}`);
      console.log(`IF SERVEDAT MISSING -> Total: ${totalTakenReal}m, Delay: ${delayReal}m -> ${delayReal > 0 ? 'DELAY' : 'ON TIME'}`);
      console.log('---------------------------');
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkOrders();
