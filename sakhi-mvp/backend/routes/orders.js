import { Router } from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Seller from "../models/Seller.js";
import Delivery from "../models/Delivery.js";
import { auth, roles, wrap, checkId, sellerForUser } from "../middleware/auth.js";
import { DESTINATIONS, WAVES, COLLECTION_POINT, currentWave, routeCode, assignBatch, todayKey } from "../utils/delivery.js";

const r = Router();
r.param("id", checkId);
const SELLER_STEPS = { PREPARING: "CONFIRMED", READY_FOR_PICKUP: "PREPARING" };

r.get("/next-wave", (req, res) => res.json({ ...currentWave(), waves: WAVES.map((w) => w.label), destinations: DESTINATIONS }));

async function withDelivery(orders) {
  const [deliveries, sellers] = await Promise.all([
    Delivery.find({ orderId: { $in: orders.map((o) => o._id) } }).select("orderId status batchId wave waveDate routeCode destinationStop collectionPoint deliveryType estimatedDeliveryMinutes packagePhotoUrl packagePhotoTakenAt"),
    Seller.find({ _id: { $in: orders.map((o) => o.sellerId) } }).select("businessName sakhiId")
  ]);
  const byOrder = new Map(deliveries.map((d) => [d.orderId.toString(), d]));
  const bySeller = new Map(sellers.map((s) => [s._id.toString(), s]));
  return orders.map((o) => ({ ...o.toObject(), seller: bySeller.get(o.sellerId.toString()) || null, delivery: byOrder.get(o._id.toString()) || null }));
}

r.post("/", auth, roles("customer"), wrap(async (req, res) => {
  const { sellerId, items, destination, deliveryType = "STANDARD" } = req.body;
  if (!DESTINATIONS.includes(destination)) return res.status(400).json({ message: `Destination must be one of ${DESTINATIONS.join(", ")}` });
  if (!Array.isArray(items) || !items.length || items.length > 50) return res.status(400).json({ message: "Order needs at least one item" });
  if (!["STANDARD", "INSTANT"].includes(deliveryType)) return res.status(400).json({ message: "Invalid delivery type" });

  const seller = sellerId && (await Seller.findById(sellerId).catch(() => null));
  if (!seller) return res.status(400).json({ message: "Seller not found" });
  if (seller.verificationStatus !== "VERIFIED") return res.status(400).json({ message: "This seller is not verified yet and cannot take orders" });
  if (deliveryType === "INSTANT" && seller.instantDelivery !== true) return res.status(400).json({ message: "Instant delivery is not available for this seller" });

  const lines = [];
  for (const i of items) {
    const qty = Number(i.quantity ?? 1);
    const p = await Product.findById(i.productId).catch(() => null);
    if (!p || !p.available || !p.sellerId.equals(seller._id)) return res.status(400).json({ message: "An item is unavailable or does not belong to this seller" });
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) return res.status(400).json({ message: "Invalid quantity" });
    lines.push({ productId: p._id, name: p.name, price: p.price, quantity: qty });
  }

  const totalAmount = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const standard = currentWave();
  const wave = deliveryType === "INSTANT" ? "INSTANT" : standard.wave;
  const waveDate = deliveryType === "INSTANT" ? todayKey() : standard.waveDate;
  const route = routeCode(destination);
  const { batchId, partners } = await assignBatch({ wave, waveDate, route });
  const estimatedDeliveryMinutes = deliveryType === "INSTANT" ? 60 : null;

  const order = await Order.create({
    customerId: req.user.userId, sellerId: seller._id, items: lines, totalAmount, destination,
    deliveryType, estimatedDeliveryMinutes, paymentStatus: "PAID", orderStatus: "CONFIRMED", wave, waveDate, batchId
  });

  try {
    await Delivery.create({
      orderId: order._id, sellerId: seller._id, wave, waveDate, batchId, routeCode: route,
      deliveryType, estimatedDeliveryMinutes, pickupArea: seller.location, collectionPoint: COLLECTION_POINT,
      destinationStop: `${destination} Stop`, ...partners
    });
  } catch (e) {
    await Order.deleteOne({ _id: order._id });
    throw e;
  }
  res.status(201).json((await withDelivery([order]))[0]);
}));

r.get("/", auth, roles("customer", "seller", "admin"), wrap(async (req, res) => {
  let query = {};
  if (req.user.role === "customer") query = { customerId: req.user.userId };
  if (req.user.role === "seller") {
    const seller = await sellerForUser(req.user.userId);
    if (!seller) return res.json([]);
    query = { sellerId: seller._id };
  }
  res.json(await withDelivery(await Order.find(query).sort({ createdAt: -1 })));
}));

async function canView(user, order) {
  if (user.role === "admin") return true;
  if (user.role === "customer") return order.customerId.toString() === user.userId;
  if (user.role === "seller") return !!(await Seller.exists({ _id: order.sellerId, userId: user.userId }));
  return false;
}

r.get("/:id", auth, roles("customer", "seller", "admin"), wrap(async (req, res) => {
  const o = await Order.findById(req.params.id);
  if (!o || !(await canView(req.user, o))) return res.status(404).json({ message: "Order not found" });
  res.json((await withDelivery([o]))[0]);
}));

r.put("/:id", auth, roles("customer", "seller", "admin"), wrap(async (req, res) => {
  const o = await Order.findById(req.params.id);
  if (!o || !(await canView(req.user, o))) return res.status(404).json({ message: "Order not found" });
  const next = req.body.orderStatus;
  const validStatuses = Order.schema.path("orderStatus").enumValues;
  if (!validStatuses.includes(next)) return res.status(400).json({ message: "Invalid order status" });
  const cancelling = next === "CANCELLED";
  if (cancelling) {
    const ok = req.user.role === "admin" ? !["DELIVERED", "CANCELLED"].includes(o.orderStatus) : req.user.role === "customer" && o.orderStatus === "CONFIRMED";
    if (!ok) return res.status(403).json({ message: "Customers can only cancel an order that is still confirmed" });
  } else {
    if (req.user.role === "customer") return res.status(403).json({ message: "Customers can only cancel an order that is still confirmed" });
    if (SELLER_STEPS[next] !== o.orderStatus) return res.status(403).json({ message: "Sellers can only move an order from confirmed to preparing to ready for pickup" });
  }
  o.orderStatus = next;
  if (cancelling && o.paymentStatus === "PAID") o.paymentStatus = "REFUNDED";
  await o.save();
  if (next === "READY_FOR_PICKUP") await Delivery.updateOne({ orderId: o._id, status: "PENDING" }, { status: "READY_FOR_PICKUP" });
  if (cancelling) await Delivery.updateOne({ orderId: o._id, status: { $ne: "DELIVERED" } }, { status: "CANCELLED" });
  res.json((await withDelivery([o]))[0]);
}));

export default r;
