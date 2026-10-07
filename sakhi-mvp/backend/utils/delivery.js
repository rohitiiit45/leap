import Delivery, { COLLECTION_POINT, FLOW } from "../models/Delivery.js";
import Order from "../models/Order.js";

export const WAVES = [
  { no: 1, label: "2:00 PM", minutes: 14 * 60 },
  { no: 2, label: "5:00 PM", minutes: 17 * 60 }
];
export const DESTINATIONS = ["Vidyanagar", "Gokul Road", "Keshwapur", "Old Hubballi"];
export { COLLECTION_POINT, FLOW };

const PICKUP_STEPS = ["READY_FOR_PICKUP", "PICKED_UP", "AT_COLLECTION"];
const LAST_MILE_STEPS = ["OUT_FOR_DELIVERY", "DELIVERED"];
const PRE_PICKUP = ["PENDING", "READY_FOR_PICKUP"];

// What the customer-facing order shows for each delivery stage.
const ORDER_STATUS = {
  READY_FOR_PICKUP: "READY_FOR_PICKUP", PICKED_UP: "PICKED_UP", AT_COLLECTION: "PICKED_UP",
  MID_MILE: "IN_TRANSIT", AT_DESTINATION: "IN_TRANSIT", OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED", CANCELLED: "CANCELLED"
};

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const dateKey = (d) => d.toISOString().slice(0, 10);
const istNow = (now) => new Date(now.getTime() + IST_OFFSET_MS);

export const todayKey = (now = new Date(Date.now())) => dateKey(istNow(now));

// Server-side wave rule, always in India time:
// before 2 PM -> 2 PM wave, before 5 PM -> 5 PM wave, otherwise tomorrow's 2 PM wave.
export function currentWave(now = new Date(Date.now())) {
  const ist = istNow(now);
  const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  const wave = WAVES.find((w) => minutes < w.minutes);
  if (wave) return { wave: wave.label, waveDate: dateKey(ist) };
  return { wave: WAVES[0].label, waveDate: dateKey(new Date(ist.getTime() + 24 * 60 * 60 * 1000)) };
}

export function routeCode(area = "") {
  const x = area.toLowerCase();
  if (x.includes("vidyanagar")) return "VID";
  if (x.includes("gokul")) return "GOK";
  if (x.includes("keshwapur")) return "KESH";
  if (x.includes("old hubballi")) return "OLDH";
  return x.replace(/[^a-z]/g, "").slice(0, 4).toUpperCase() || "OTH";
}

const waveNo = (label) => (WAVES.find((w) => w.label === label) || WAVES[0]).no;

// Orders for the same wave, day and route share a batch until pickup has started.
export async function assignBatch({ wave, waveDate, route }) {
  const latest = await Delivery.findOne({ wave, waveDate, routeCode: route }).sort({ createdAt: -1 });
  if (latest) {
    const started = await Delivery.exists({ batchId: latest.batchId, status: { $nin: [...PRE_PICKUP, "CANCELLED"] } });
    if (!started) {
      return {
        batchId: latest.batchId,
        partners: pickPartners(latest)
      };
    }
  }
  const prefix = wave === "INSTANT" ? `INSTANT-${route}-` : `W${waveNo(wave)}-${route}-`;
  const existing = await Delivery.distinct("batchId", { batchId: { $regex: `^${prefix}` } });
  return { batchId: `${prefix}${String(existing.length + 1).padStart(3, "0")}`, partners: {} };
}

const pickPartners = (d) => ({
  pickupPartnerId: d.pickupPartnerId, pickupPartner: d.pickupPartner,
  lastMilePartnerId: d.lastMilePartnerId, lastMilePartner: d.lastMilePartner
});

const sameId = (a, b) => !!a && a.toString() === b;

// Returns { code, message } when the move is not allowed, otherwise null.
export function transitionError(d, next, user) {
  if (d.status === "CANCELLED") return { code: 409, message: "This delivery is cancelled" };
  const from = FLOW.indexOf(d.status);
  const to = FLOW.indexOf(next);

  if (user.role === "admin") {
    if (next === "CANCELLED") return d.status === "DELIVERED" ? { code: 409, message: "A delivered order cannot be cancelled" } : null;
    if (to < 0) return { code: 400, message: "Invalid delivery status" };
    return Math.abs(to - from) === 1 ? null : { code: 409, message: "Status can only move one stage at a time" };
  }
  if (to !== from + 1) return { code: 409, message: `Cannot move a delivery from ${d.status} to ${next}` };
  if (PICKUP_STEPS.includes(next))
    return sameId(d.pickupPartnerId, user.userId) ? null : { code: 403, message: "Only the pickup partner can make this update" };
  if (LAST_MILE_STEPS.includes(next))
    return sameId(d.lastMilePartnerId, user.userId) ? null : { code: 403, message: "Only the last-mile partner can make this update" };
  return { code: 403, message: "This stage is handled by the platform" };
}

export async function moveDelivery(d, next, user) {
  const order = await Order.findById(d.orderId);
  if (!order) return { code: 404, message: "Order not found" };
  const err = transitionError(d, next, user);
  if (err) return err;
  if (next === "PICKED_UP") {
    if (user.role !== "admin" && order.orderStatus !== "READY_FOR_PICKUP")
      return { code: 409, message: "The seller has not marked this order ready for pickup" };
    if (user.role !== "admin" && !d.packagePhotoUrl)
      return { code: 409, message: "A package photo is required before pickup" };
  }

  d.status = next;
  await d.save();
  const mapped = ORDER_STATUS[next];
  const waitingOnSeller = next === "READY_FOR_PICKUP" && ["CONFIRMED", "PREPARING"].includes(order.orderStatus);
  if (mapped && !waitingOnSeller && order.orderStatus !== mapped) {
    order.orderStatus = mapped;
    if (mapped === "CANCELLED" && order.paymentStatus === "PAID") order.paymentStatus = "REFUNDED";
    await order.save();
  }
  return null;
}

// Groups delivery records into batches. Cancelled records are not counted.
export function summarizeBatches(deliveries) {
  const map = new Map();
  for (const d of deliveries) {
    const b = map.get(d.batchId) || {
      batchId: d.batchId, wave: d.wave, waveDate: d.waveDate, routeCode: d.routeCode,
      destinationStop: d.destinationStop, collectionPoint: d.collectionPoint,
      pickupPartner: null, lastMilePartner: null, statusCounts: {}, orderIds: new Set(), sellerIds: new Set()
    };
    b.statusCounts[d.status] = (b.statusCounts[d.status] || 0) + 1;
    if (d.status !== "CANCELLED") { b.orderIds.add(String(d.orderId)); b.sellerIds.add(String(d.sellerId)); }
    if (d.pickupPartnerId) b.pickupPartner = { id: d.pickupPartnerId, name: d.pickupPartner };
    if (d.lastMilePartnerId) b.lastMilePartner = { id: d.lastMilePartnerId, name: d.lastMilePartner };
    map.set(d.batchId, b);
  }
  return [...map.values()].map(({ orderIds, sellerIds, ...b }) => {
    const live = Object.keys(b.statusCounts).filter((s) => s !== "CANCELLED");
    // The batch is only as far along as its least advanced package.
    const stage = live.length ? FLOW[Math.min(...live.map((s) => FLOW.indexOf(s)))] : "CANCELLED";
    return { ...b, orders: orderIds.size, sellers: sellerIds.size, stage };
  }).sort((a, b) => a.waveDate.localeCompare(b.waveDate) || a.wave.localeCompare(b.wave) || a.batchId.localeCompare(b.batchId));
}
