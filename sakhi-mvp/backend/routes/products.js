import { Router } from "express";
import Product from "../models/Product.js";
import Seller from "../models/Seller.js";
import { auth, roles, wrap, checkId, sellerForUser, pick } from "../middleware/auth.js";
import { uploadImage } from "../middleware/upload.js";
import { uploadBuffer } from "../utils/cloudinary.js";

const r = Router();
r.param("id", checkId);
const FIELDS = ["name", "description", "price", "category", "available"];

r.get("/", wrap(async (req, res) => res.json(await Product.find({ available: true }).sort({ createdAt: -1 }))));
r.get("/mine", auth, roles("seller"), wrap(async (req, res) => {
  const seller = await sellerForUser(req.user.userId);
  res.json(seller ? await Product.find({ sellerId: seller._id }).sort({ createdAt: -1 }) : []);
}));
r.get("/:id", wrap(async (req, res) => {
  const p = await Product.findById(req.params.id);
  if (!p || !p.available) return res.status(404).json({ message: "Product not found" });
  res.json(p);
}));

async function ownerSeller(req) {
  if (req.user.role === "seller") return sellerForUser(req.user.userId);
  return req.body.sellerId ? Seller.findById(req.body.sellerId) : null;
}

r.post("/", auth, roles("seller", "admin"), uploadImage.single("image"), wrap(async (req, res) => {
  const seller = await ownerSeller(req);
  if (!seller) return res.status(400).json({ message: "Seller profile not found" });
  if (!req.body.name || !(Number(req.body.price) >= 0)) return res.status(400).json({ message: "Name and a valid price are required" });

  let image = "";
  if (req.file) {
    const uploaded = await uploadBuffer(req.file.buffer, "sakhi/products");
    image = uploaded.secure_url;
  }

  res.status(201).json(await Product.create({
    ...pick(req.body, FIELDS),
    price: Number(req.body.price),
    image,
    sellerId: seller._id,
  }));
}));

async function loadOwned(req, res) {
  const p = await Product.findById(req.params.id);
  if (!p) { res.status(404).json({ message: "Product not found" }); return null; }
  if (req.user.role === "seller") {
    const seller = await sellerForUser(req.user.userId);
    if (!seller || !seller._id.equals(p.sellerId)) {
      res.status(403).json({ message: "You can only manage your own products" });
      return null;
    }
  }
  return p;
}

r.put("/:id", auth, roles("seller", "admin"), uploadImage.single("image"), wrap(async (req, res) => {
  const p = await loadOwned(req, res);
  if (!p) return;
  Object.assign(p, pick(req.body, FIELDS));
  if (req.body.price !== undefined) {
    const price = Number(req.body.price);
    if (!(price >= 0)) return res.status(400).json({ message: "Price must be valid" });
    p.price = price;
  }
  if (req.file) {
    const uploaded = await uploadBuffer(req.file.buffer, "sakhi/products");
    p.image = uploaded.secure_url;
  }
  await p.save();
  res.json(p);
}));

r.delete("/:id", auth, roles("seller", "admin"), wrap(async (req, res) => {
  const p = await loadOwned(req, res);
  if (!p) return;
  p.available = false;
  await p.save();
  res.json({ message: "Product removed" });
}));

export default r;
