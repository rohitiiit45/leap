import { Router } from "express";
import Seller from "../models/Seller.js";
import { auth, roles, wrap, checkId, sellerForUser, pick } from "../middleware/auth.js";

const r = Router();
r.param("id", checkId);

// Public responses never include the owning user's id.
const PUBLIC = "-userId -ownerName -__v";

r.get("/", wrap(async (req, res) => res.json(await Seller.find().select(PUBLIC).sort({ createdAt: -1 }))));

r.get("/me", auth, roles("seller"), wrap(async (req, res) => {
  const s = await sellerForUser(req.user.userId);
  if (!s) return res.status(404).json({ message: "Seller profile not found" });
  res.json(s);
}));

r.get("/:id", wrap(async (req, res) => {
  const s = await Seller.findById(req.params.id).select(PUBLIC);
  if (!s) return res.status(404).json({ message: "Seller not found" });
  res.json(s);
}));

r.put("/:id", auth, roles("seller", "admin"), wrap(async (req, res) => {
  const s = await Seller.findById(req.params.id);
  if (!s) return res.status(404).json({ message: "Seller not found" });
  if (req.user.role === "seller" && s.userId.toString() !== req.user.userId) return res.status(403).json({ message: "You can only edit your own profile" });
  // Verification, trust score and Sakhi ID are platform-controlled.
  Object.assign(s, pick(req.body, ["businessName", "category", "description", "location"]));
  if (req.user.role === "admin") Object.assign(s, pick(req.body, ["ownerName"]));
  await s.save();
  res.json(s);
}));

export default r;
