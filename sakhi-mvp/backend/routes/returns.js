import { Router } from "express";
import ReturnRequest from "../models/ReturnRequest.js";
import Order from "../models/Order.js";
import { auth, roles, wrap, checkId } from "../middleware/auth.js";
import { uploadImage } from "../middleware/upload.js";
import { uploadBuffer } from "../utils/cloudinary.js";

const r = Router();
r.param("orderId", checkId);
r.param("id", checkId);

r.post("/:orderId", auth, roles("customer"), uploadImage.single("photo"), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Return photo is required" });
  if (!req.body.reason?.trim()) return res.status(400).json({ message: "Return reason is required" });

  const order = await Order.findById(req.params.orderId);
  if (!order || order.customerId.toString() !== req.user.userId) return res.status(404).json({ message: "Order not found" });
  if (order.orderStatus !== "DELIVERED") return res.status(400).json({ message: "Only delivered orders can be returned" });

  const existing = await ReturnRequest.findOne({ orderId: order._id, status: { $in: ["REQUESTED", "APPROVED"] } });
  if (existing) return res.status(409).json({ message: "A return request already exists for this order" });

  const uploaded = await uploadBuffer(req.file.buffer, "sakhi/returns");
  const result = await ReturnRequest.create({
    orderId: order._id, customerId: order.customerId, sellerId: order.sellerId,
    reason: req.body.reason.trim(), photoUrl: uploaded.secure_url
  });
  res.status(201).json(result);
}));

r.get("/mine", auth, roles("customer"), wrap(async (req, res) => {
  res.json(await ReturnRequest.find({ customerId: req.user.userId }).sort({ createdAt: -1 }));
}));

export default r;
