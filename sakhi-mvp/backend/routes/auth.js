import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Seller from "../models/Seller.js";
import { generateSakhiId } from "../utils/generateId.js";
import { wrap } from "../middleware/auth.js";

const r = Router();
const sign = (u) => jwt.sign({ userId: u._id.toString(), role: u.role }, process.env.JWT_SECRET, { expiresIn: "4h" });
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });
const text = (v) => typeof v === "string" ? v.trim() : "";

// Public registration. Admins and delivery partners are created by the platform (seed/admin), never here.
const SELF_SERVE_ROLES = ["customer", "seller", "delivery_partner"];

r.post("/register", wrap(async (req, res) => {
  const name = text(req.body.name), email = text(req.body.email).toLowerCase(), password = req.body.password;
  const role = req.body.role || "customer";
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address" });
  if (!name || !email || typeof password !== "string") return res.status(400).json({ message: "Name, email and password are required" });
  if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
  if (!SELF_SERVE_ROLES.includes(role)) return res.status(403).json({ message: "This role cannot be created through public registration" });
  if (await User.exists({ email })) return res.status(409).json({ message: "Email already registered" });

  let user;
  try {
    user = await User.create({ name, email, password: await bcrypt.hash(password, 10), role, phone: text(req.body.phone), deliveryArea: text(req.body.deliveryArea), vehicleType: text(req.body.vehicleType) });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "Email already registered" });
    throw e;
  }
  if (role === "seller") {
    try {
      await Seller.create({
        userId: user._id,
        sakhiId: await generateSakhiId(),
        businessName: text(req.body.businessName) || `${name}'s Business`,
        ownerName: name,
        category: text(req.body.category) || "Other Local Businesses",
        description: text(req.body.description),
        location: text(req.body.location) || "Hubballi"
      });
    } catch (e) {
      await User.deleteOne({ _id: user._id });
      throw e;
    }
  }
  res.status(201).json({ token: sign(user), user: publicUser(user) });
}));

r.post("/login", wrap(async (req, res) => {
  const email = text(req.body.email).toLowerCase();
  const user = typeof req.body.password === "string" && email ? await User.findOne({ email }) : null;
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) return res.status(401).json({ message: "Invalid credentials" });
  if (user.role === "admin" && process.env.ADMIN_EMAIL && user.email !== process.env.ADMIN_EMAIL.trim().toLowerCase()) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  res.json({ token: sign(user), user: publicUser(user) });
}));

export default r;
