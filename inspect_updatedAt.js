
require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

try { dns.setServers(['8.8.8.8', '8.8.4.4']); } catch (e) {}

async function checkOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
    const orders = await Order.find({ 
      status: { $in: ['served', 'completed'] },
      isDeleted: { $ne: true }
    }).sort({ createdAt: -1 }).limit(10);

    orders.forEach(o => {
      console.log(`Order #: ${o.orderNumber}, Created: ${o.createdAt}, Updated: ${o.updatedAt}, ServedAt: ${o.servedAt}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkOrders();
