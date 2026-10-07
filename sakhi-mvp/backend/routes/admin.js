import { Router } from "express";
import Seller from "../models/Seller.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Delivery from "../models/Delivery.js";
import ReturnRequest from "../models/ReturnRequest.js";
import { auth, roles, wrap, checkId } from "../middleware/auth.js";
import { WAVES, FLOW, summarizeBatches, todayKey } from "../utils/delivery.js";

const r = Router();
r.param("id", checkId);
r.use(auth, roles("admin"));

const VERIFICATION = Seller.schema.path("verificationStatus").enumValues;
const FINISHED = ["DELIVERED", "CANCELLED"];

// Live deliveries plus anything scheduled for today.
const relevantDeliveries = () => Delivery.find({ $or: [{ status: { $nin: FINISHED } }, { waveDate: todayKey() }] });

r.get("/stats", wrap(async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  res.json({
    totalSellers: await Seller.countDocuments(),
    verifiedSellers: await Seller.countDocuments({ verificationStatus: "VERIFIED" }),
    pendingVerification: await Seller.countDocuments({ verificationStatus: { $in: ["PENDING", "UNDER_REVIEW"] } }),
    totalCustomers: await User.countDocuments({ role: "customer" }),
    deliveryPartners: await User.countDocuments({ role: "delivery_partner" }),
    todayOrders: await Order.countDocuments({ createdAt: { $gte: startOfDay } }),
    activeBatches: (await Delivery.distinct("batchId", { status: { $nin: FINISHED } })).length
  });
}));

r.get("/partners", wrap(async (req, res) =>
  res.json(await User.find({ role: "delivery_partner" }).select("name email").sort({ name: 1 }))));

r.get("/batches", wrap(async (req, res) =>
  res.json(summarizeBatches(await relevantDeliveries()))));

// One card per fixed wave, with its batches rolled up.
r.get("/waves", wrap(async (req, res) => {
  const batches = summarizeBatches(await relevantDeliveries());
  res.json(WAVES.map((w) => {
    const own = batches.filter((b) => b.wave === w.label);
    const statuses = {};
    for (const b of own) for (const [s, n] of Object.entries(b.statusCounts)) if (!FINISHED.includes(s)) statuses[s] = (statuses[s] || 0) + n;
    return {
      wave: w.label,
      batches: own.length,
      orders: own.reduce((sum, b) => sum + b.orders, 0),
      destinations: [...new Set(own.map((b) => b.destinationStop))],
      statuses: Object.fromEntries(FLOW.filter((s) => statuses[s]).map((s) => [s, statuses[s]])),
      batchIds: own.map((b) => b.batchId)
    };
  }));
}));

// Assign pickup and/or last-mile partner to every package in a batch.
r.put("/batches/:batchId", wrap(async (req, res) => {
  const update = {};
  for (const [idField, nameField] of [["pickupPartnerId", "pickupPartner"], ["lastMilePartnerId", "lastMilePartner"]]) {
    if (!req.body[idField]) continue;
    const partner = await User.findOne({ _id: req.body[idField], role: "delivery_partner" }).catch(() => null);
    if (!partner) return res.status(400).json({ message: "Delivery partner not found" });
    update[idField] = partner._id;
    update[nameField] = partner.name;
  }
  if (!Object.keys(update).length) return res.status(400).json({ message: "Choose a pickup or last-mile partner" });
  const result = await Delivery.updateMany({ batchId: req.params.batchId, status: { $ne: "CANCELLED" } }, update);
  if (!result.matchedCount) return res.status(404).json({ message: "Batch not found" });
  res.json(summarizeBatches(await Delivery.find({ batchId: req.params.batchId }))[0]);
}));

r.get("/verifications", wrap(async (req, res) =>
  res.json(await Seller.find({ verificationStatus: { $ne: "VERIFIED" } }).sort({ createdAt: -1 }))));

r.put("/verification/:id", wrap(async (req, res) => {
  const { status } = req.body;
  if (!VERIFICATION.includes(status)) return res.status(400).json({ message: `Status must be one of ${VERIFICATION.join(", ")}` });
  const s = await Seller.findById(req.params.id);
  if (!s) return res.status(404).json({ message: "Seller not found" });
  s.verificationStatus = status;
  s.trustScore = status === "VERIFIED" ? s.trustScore || 4.8 : 0; // starting trust signal, not a certification
  await s.save();
  res.json(s);
}));


r.get("/returns", wrap(async (req, res) =>
  res.json(await ReturnRequest.find()
    .populate("orderId", "items totalAmount destination orderStatus")
    .populate("customerId", "name email")
    .populate("sellerId", "businessName")
    .sort({ createdAt: -1 }))
));

r.put("/returns/:id", wrap(async (req, res) => {
  const allowed = ["REQUESTED", "APPROVED", "REJECTED", "COMPLETED"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid return status" });
  const result = await ReturnRequest.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status, adminNote: req.body.adminNote || "" },
    { new: true }
  );
  if (!result) return res.status(404).json({ message: "Return request not found" });
  res.json(result);
}));

export default r;
