const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const uri = "mongodb+srv://kidayos2014:holyunion@cluster0.pxcpi49.mongodb.net/abekurt";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  plainPassword: { type: String },
  role: { type: String, enum: ["admin", "cashier", "chef", "display"], default: "cashier" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

async function seed() {
  try {
    console.log("Connecting to Atlas...");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB Atlas!");

    const User = mongoose.models.User || mongoose.model("User", userSchema);

    const email = "kidayos2014@gmail.com";
    const password = "123456";
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create or update admin
    await User.findOneAndUpdate(
      { email },
      {
        name: "Super Admin",
        email,
        password: hashedPassword,
        plainPassword: password,
        role: "admin",
        isActive: true
      },
      { upsert: true, new: true }
    );

    console.log("Admin user successfully seeded to Atlas!");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding Atlas:", err);
    process.exit(1);
  }
}

seed();
