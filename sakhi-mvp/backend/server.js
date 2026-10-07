import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "./models/User.js";

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set. Copy .env.example to .env first.");
  process.exit(1);
}
const { default: app } = await import("./app.js");

const port = process.env.PORT || 5000;

async function ensureConfiguredAdmin() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) return;
  const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ email });
  const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  if (!existing) {
    await User.create({ name: "Sakhi Admin", email, password, role: "admin" });
    console.log(`Configured admin created: ${email}`);
    return;
  }
  if (existing.role !== "admin") {
    throw new Error(`ADMIN_EMAIL belongs to a non-admin account: ${email}`);
  }
  existing.name = "Sakhi Admin";
  existing.password = password;
  await existing.save();
  console.log(`Configured admin ready: ${email}`);
}

mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sakhi")
  .then(async () => {
    await ensureConfiguredAdmin();
    app.listen(port, () => console.log(`Sakhi API running on http://localhost:${port}`));
  })
  .catch((err) => { console.error("MongoDB connection failed:", err.message); process.exit(1); });
