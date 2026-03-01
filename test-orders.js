const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/abekurtbet');
  const Order = mongoose.connection.collection('orders');
  
  // Create test orders
  await Order.deleteMany({ orderNumber: /TEST/ });
  
  await Order.insertOne({
    orderNumber: "TEST1",
    createdBy: "cashier1",
    isDeleted: true
  });
  
  await Order.insertOne({
    orderNumber: "TEST2",
    createdBy: "cashier1",
    isDeleted: false
  });
  
  const query = { isDeleted: { $ne: true }, createdBy: "cashier1" };
  const res1 = await Order.find(query).toArray();
  console.log("Without OR:", res1.map(o => o.orderNumber));
  
  const query2 = { isDeleted: { $ne: true }, $or: [ { createdBy: "cashier1" } ] };
  const res2 = await Order.find(query2).toArray();
  console.log("With OR:", res2.map(o => o.orderNumber));
  
  await mongoose.disconnect();
}
test().catch(console.error);
