const mongoose = require('mongoose');
require('dotenv').config();

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  createdAt: Date
}, { timestamps: true });

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const orders = await Order.find({ orderNumber: /^\d+$/ })
      .sort({ orderNumber: -1 })
      .limit(10)
      .lean();

    console.log("Last 10 orders by orderNumber DESC:");
    orders.forEach(o => console.log(`${o.orderNumber} - ${o.createdAt}`));

    const ordersByDate = await Order.find({ orderNumber: /^\d+$/ })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log("\nLast 10 orders by createdAt DESC:");
    ordersByDate.forEach(o => console.log(`${o.orderNumber} - ${o.createdAt}`));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
