import mongoose from "mongoose"
import dns from "dns"

// Fix for DNS resolution issues with MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '8.8.4.4'])
  console.log("🌐 Global DNS servers set to Google DNS (8.8.8.8, 8.8.4.4)")
} catch (e) {
  console.warn("⚠️ Failed to set global DNS servers:", e)
}


const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/restaurant-management"

// Standard Mongoose connection caching for Next.js/Vercel
let cached = (global as any).mongoose

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null }
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    console.log("🔄 Initializing new MongoDB connection...")
    cached.promise = mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    }).then(async (m) => {
      console.log("✅ MongoDB connected successfully")

      // 🚀 BOOTSTRAP MODELS: Force registration of all schemas
      // This prevents "Schema hasn't been registered" errors in serverless environments
      await Promise.all([
        import("./models/user"),
        import("./models/table"),
        import("./models/batch"),
        import("./models/order"),
        import("./models/menu-item"),
        import("./models/stock"),
        import("./models/category")
      ])
      console.log("📦 All Mongoose models registered")

      return m
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    console.error("❌ MongoDB connection error:", e)
    throw e
  }

  return cached.conn
}
