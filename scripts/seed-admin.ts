import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, "../.env") });

import { connectDB } from "../lib/db";
import User from "../lib/models/user";

// Import other models to ensure their schemas are registered
import "../lib/models/floor";
import "../lib/models/table";
import "../lib/models/category";
import "../lib/models/menu-item";
import "../lib/models/order";
import "../lib/models/stock";
import "../lib/models/settings";
import "../lib/models/daily-expense";
import "../lib/models/fixed-asset";
import "../lib/models/store-log";
import "../lib/models/audit-log";

async function seed() {
  try {
    console.log("🚀 Starting database initialization...");
    
    await connectDB();
    console.log("✅ Connected to MongoDB.");

    const email = "kidayos2014@gmail.com";
    const password = "123456";

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email });
    
    if (existingAdmin) {
      console.log(`ℹ️ Admin user with email ${email} already exists. Updating credentials...`);
      const hashedPassword = await bcrypt.hash(password, 10);
      
      existingAdmin.name = "Super Admin";
      existingAdmin.password = hashedPassword;
      existingAdmin.plainPassword = password;
      existingAdmin.role = "admin";
      existingAdmin.isActive = true;
      
      await existingAdmin.save();
      console.log("✅ Admin user updated successfully.");
    } else {
      console.log(`📝 Creating new admin user: ${email}`);
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const adminUser = new User({
        name: "Super Admin",
        email: email,
        password: hashedPassword,
        plainPassword: password,
        role: "admin",
        isActive: true
      });
      
      await adminUser.save();
      console.log("✅ Admin user created successfully.");
    }

    console.log("📦 All database collections and schemas initialized.");
    console.log("🎉 Database initialization completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
