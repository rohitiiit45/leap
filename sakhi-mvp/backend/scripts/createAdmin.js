import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/User.js";

if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing");
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required");

await mongoose.connect(process.env.MONGO_URI);
const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
await User.findOneAndUpdate(
  { email },
  { name: "Sakhi Admin", email, password, role: "admin" },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);
console.log(`Admin ready: ${email}`);
await mongoose.disconnect();
