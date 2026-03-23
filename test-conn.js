
const mongoose = require('mongoose');
require('dotenv').config();

async function testConn() {
    try {
        console.log("Connecting to:", process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        console.log("Connected successfully!");
        mongoose.disconnect();
    } catch (err) {
        console.error("Connection failed:", err.message);
    }
}

testConn();
