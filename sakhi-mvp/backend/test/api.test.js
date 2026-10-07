// Runs against a real MongoDB (or compatible) server. Set TEST_MONGO_URI to override; the database is wiped.
import { before, after, describe, it } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

process.env.JWT_SECRET = "test-secret";
process.env.MONGO_URI = process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:27017/sakhi_test";

// The server decides waves from its clock, so tests control that clock (India time shown in comments).
let now = 0, tick = 0;
const realNow = Date.now;
const setClock = (iso) => { now = new Date(iso).getTime(); tokens.clear(); };
Date.now = () => now + tick++;
const tokens = new Map();

let server, base;
const ids = {};

async function call(method, path, token, body) {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
async function login(email) {
  if (!tokens.has(email)) {
    const r = await call("POST", "/auth/login", null, { email, password: "password" });
    assert.equal(r.status, 200, `login ${email}`);
    tokens.set(email, r.body.token);
  }
  return tokens.get(email);
}
const as = async (email, method, path, body) => call(method, path, await login(email), body);

const ADMIN = "admin@sakhi.demo", PRIYA = "seller@sakhi.demo", ANANYA = "ananya@sakhi.demo", KAVITA = "kavita@sakhi.demo", MEERA = "meera@sakhi.demo";
const C1 = "customer@sakhi.demo", C2 = "customer2@sakhi.demo";
const RAHUL = "delivery@sakhi.demo", SUNITA = "delivery2@sakhi.demo", VIKRAM = "delivery3@sakhi.demo";

before(async () => {
  setClock("2026-10-07T07:30:00Z"); // 1:00 PM IST
  await mongoose.connect(process.env.MONGO_URI);
  await mongoose.connection.dropDatabase();
  await import("../seed.js"); // seeds and disconnects
  await mongoose.connect(process.env.MONGO_URI);
  const { default: app } = await import("../app.js");
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  for (const [key, email] of Object.entries({ priya: PRIYA, ananya: ANANYA, kavita: KAVITA, meera: MEERA })) {
    ids[key] = (await as(email, "GET", "/sellers/me")).body._id;
  }
  const products = (await call("GET", "/products")).body;
  const byName = (n) => products.find((p) => p.name === n)._id;
  Object.assign(ids, { cake: byName("Chocolate Truffle Cake"), macrame: byName("Macrame Wall Art"), blouse: byName("Silk Blouse Piece"), hamper: byName("Handmade Gift Hamper") });
});
after(async () => {
  Date.now = realNow;
  server?.close();
  await mongoose.disconnect();
});

const place = (email, sellerId, productId, destination, extra = {}) =>
  as(email, "POST", "/orders", { sellerId, destination, items: [{ productId, quantity: 1 }], ...extra });

describe("wave rule", () => {
  it("picks the wave from India time", async () => {
    const { currentWave } = await import("../utils/delivery.js");
    assert.deepEqual(currentWave(new Date("2026-10-07T07:30:00Z")), { wave: "2:00 PM", waveDate: "2026-10-07" }); // 1:00 PM IST
    assert.deepEqual(currentWave(new Date("2026-10-07T10:30:00Z")), { wave: "5:00 PM", waveDate: "2026-10-07" }); // 4:00 PM IST
    assert.deepEqual(currentWave(new Date("2026-10-07T11:30:00Z")), { wave: "2:00 PM", waveDate: "2026-10-08" }); // 5:00 PM IST
    assert.deepEqual(currentWave(new Date("2026-10-07T19:00:00Z")), { wave: "2:00 PM", waveDate: "2026-10-08" }); // 12:30 AM IST next day
  });
});

describe("auth", () => {
  it("logs in all four roles", async () => {
    for (const e of [ADMIN, PRIYA, C1, RAHUL]) assert.ok(await login(e));
  });
  it("rejects missing and invalid tokens with 401", async () => {
    assert.equal((await call("GET", "/orders")).status, 401);
    assert.equal((await call("GET", "/orders", "not.a.jwt")).status, 401);
    assert.equal((await call("GET", "/admin/stats", "garbage")).status, 401);
  });
  it("wrong password is 401", async () => {
    assert.equal((await call("POST", "/auth/login", null, { email: C1, password: "nope" })).status, 401);
  });
  it("public registration cannot create admins or delivery partners", async () => {
    for (const role of ["admin", "delivery_partner"])
      assert.equal((await call("POST", "/auth/register", null, { name: "X", email: `${role}@x.test`, password: "secret1", role })).status, 403);
  });
  it("seller registration issues a unique Sakhi ID", async () => {
    const a = await call("POST", "/auth/register", null, { name: "New Sakhi", email: "new1@x.test", password: "secret1", role: "seller" });
    const b = await call("POST", "/auth/register", null, { name: "New Sakhi 2", email: "new2@x.test", password: "secret1", role: "seller" });
    assert.equal(a.status, 201);
    const s1 = (await call("GET", "/sellers/me", a.body.token)).body, s2 = (await call("GET", "/sellers/me", b.body.token)).body;
    assert.match(s1.sakhiId, /^SK-HBL-\d{5}$/);
    assert.notEqual(s1.sakhiId, s2.sakhiId);
    assert.equal(s1.verificationStatus, "PENDING");
  });
});

describe("authorization", () => {
  it("customer, seller and delivery partner are blocked from admin routes", async () => {
    for (const e of [C1, PRIYA, RAHUL]) {
      assert.equal((await as(e, "GET", "/admin/stats")).status, 403);
      assert.equal((await as(e, "GET", "/admin/batches")).status, 403);
      assert.equal((await as(e, "GET", "/admin/waves")).status, 403);
    }
  });
  it("delivery partner cannot manage orders or products", async () => {
    assert.equal((await as(RAHUL, "GET", "/orders")).status, 403);
    assert.equal((await as(RAHUL, "POST", "/products", { name: "x", price: 1 })).status, 403);
    assert.equal((await as(RAHUL, "GET", "/products/mine")).status, 403);
    assert.equal((await as(RAHUL, "GET", "/sellers/me")).status, 403);
  });
  it("customer and seller cannot use the delivery API", async () => {
    assert.equal((await as(C1, "GET", "/delivery")).status, 403);
    assert.equal((await as(PRIYA, "GET", "/delivery")).status, 403);
  });
});

describe("seller", () => {
  it("sees the profile and only its own orders", async () => {
    const me = await as(PRIYA, "GET", "/sellers/me");
    assert.equal(me.status, 200);
    assert.equal(me.body.sakhiId, "SK-HBL-00452");
    const orders = (await as(PRIYA, "GET", "/orders")).body;
    assert.ok(orders.length >= 3);
    assert.ok(orders.every((o) => o.sellerId === me.body._id));
  });
  it("cannot change platform-controlled fields", async () => {
    const r = await as(PRIYA, "PUT", `/sellers/${ids.priya}`, { verificationStatus: "REJECTED", trustScore: 1, sakhiId: "SK-HBL-99999", businessName: "Priya Bakes" });
    assert.equal(r.status, 200);
    assert.equal(r.body.sakhiId, "SK-HBL-00452");
    assert.equal(r.body.verificationStatus, "VERIFIED");
    assert.equal(r.body.trustScore, 4.8);
    assert.equal(r.body.businessName, "Priya Bakes");
  });
  it("cannot edit another seller's profile", async () => {
    assert.equal((await as(PRIYA, "PUT", `/sellers/${ids.ananya}`, { businessName: "Hijacked" })).status, 403);
  });
  it("manages only its own products", async () => {
    const created = await as(PRIYA, "POST", "/products", { name: "Lemon Tart", price: 150, category: "Bakery", sellerId: ids.ananya });
    assert.equal(created.status, 201);
    assert.equal(created.body.sellerId, ids.priya); // body sellerId ignored
    const id = created.body._id;
    const edited = await as(PRIYA, "PUT", `/products/${id}`, { price: 175, sellerId: ids.ananya });
    assert.equal(edited.body.price, 175);
    assert.equal(edited.body.sellerId, ids.priya);
    assert.equal((await as(PRIYA, "PUT", `/products/${ids.macrame}`, { price: 1 })).status, 403);
    assert.equal((await as(PRIYA, "DELETE", `/products/${ids.macrame}`)).status, 403);
    assert.equal((await as(PRIYA, "PUT", `/products/${id}`, { price: -5 })).status, 400);
    assert.equal((await as(PRIYA, "DELETE", `/products/${id}`)).status, 200);
    const mine = (await as(PRIYA, "GET", "/products/mine")).body;
    assert.equal(mine.find((p) => p._id === id).available, false);
    assert.ok(!(await call("GET", "/products")).body.some((p) => p._id === id));
  });
});

describe("customer ordering and batching", () => {
  it("customer can browse sellers and products", async () => {
    assert.ok((await call("GET", "/sellers")).body.length >= 5);
    assert.ok((await call("GET", "/products")).body.length >= 8);
  });

  it("server decides wave and price, ignoring the client", async () => {
    const r = await place(C1, ids.priya, ids.cake, "Vidyanagar", { wave: "11:00 PM", totalAmount: 1, batchId: "HACK-001" });
    assert.equal(r.status, 201);
    assert.equal(r.body.wave, "2:00 PM"); // 1:00 PM IST
    assert.equal(r.body.totalAmount, 500);
    assert.equal(r.body.batchId, "W1-VID-002"); // 001 is seed data that has already left
    assert.equal(r.body.delivery.status, "PENDING");
    ids.order1 = r.body._id;
  });
  it("client-sent item price is ignored", async () => {
    const r = await as(C2, "POST", "/orders", { sellerId: ids.ananya, destination: "Vidyanagar", items: [{ productId: ids.macrame, quantity: 2, price: 1, name: "Free" }] });
    assert.equal(r.status, 201);
    assert.equal(r.body.totalAmount, 900);
    assert.equal(r.body.items[0].name, "Macrame Wall Art");
    assert.equal(r.body.batchId, "W1-VID-002"); // same wave + route joins the open batch
    ids.order2 = r.body._id;
  });
  it("different route in the same wave gets its own batch", async () => {
    const r = await place(C1, ids.kavita, ids.blouse, "Gokul Road");
    assert.equal(r.body.batchId, "W1-GOK-001");
    ids.orderGok = r.body._id;
  });
  it("different wave does not share a batch", async () => {
    setClock("2026-10-07T10:30:00Z"); // 4:00 PM IST
    const r = await place(C1, ids.priya, ids.cake, "Gokul Road");
    assert.equal(r.body.wave, "5:00 PM");
    assert.equal(r.body.batchId, "W2-GOK-001"); // joins the open seeded 5 PM batch
    ids.orderW2 = r.body._id;
    const sameRouteOtherWave = await place(C2, ids.kavita, ids.blouse, "Vidyanagar");
    assert.equal(sameRouteOtherWave.body.batchId, "W2-VID-001");
  });
  it("orders after 5 PM roll to the next day's 2 PM wave", async () => {
    setClock("2026-10-07T11:30:00Z"); // 5:00 PM IST
    const r = await place(C2, ids.priya, ids.cake, "Vidyanagar");
    assert.equal(r.body.wave, "2:00 PM");
    assert.equal(r.body.waveDate, "2026-10-08");
    assert.equal(r.body.batchId, "W1-VID-003"); // not the batch of today's 2 PM wave
  });
  it("rejects bad input", async () => {
    setClock("2026-10-07T07:30:00Z");
    assert.equal((await place(C1, ids.priya, ids.cake, "Mars")).status, 400);
    assert.equal((await place(C1, ids.priya, ids.cake)).status, 400);
    assert.equal((await place(C1, ids.priya, ids.macrame, "Vidyanagar")).status, 400); // product of another seller
    assert.equal((await place(C1, ids.meera, ids.cake, "Vidyanagar")).status, 400); // unverified seller
    assert.equal((await as(C1, "POST", "/orders", { sellerId: ids.priya, destination: "Vidyanagar", items: [] })).status, 400);
    assert.equal((await place(PRIYA, ids.priya, ids.cake, "Vidyanagar")).status, 403); // seller cannot order
  });
  it("customer sees only their own orders, with batch and delivery details", async () => {
    const mine = (await as(C1, "GET", "/orders")).body;
    assert.ok(mine.length >= 5);
    const o = mine.find((x) => x._id === ids.order1);
    assert.equal(o.batchId, "W1-VID-002");
    assert.equal(o.seller.businessName, "Priya Bakes");
    assert.equal(o.delivery.destinationStop, "Vidyanagar Stop");
    assert.ok(!mine.some((x) => x._id === ids.order2));
    assert.equal((await as(C2, "GET", `/orders/${ids.order1}`)).status, 404);
    assert.equal((await as(C2, "PUT", `/orders/${ids.order1}`, { orderStatus: "CANCELLED" })).status, 404);
  });
  it("batch ids are not all 001", async () => {
    const batches = (await as(ADMIN, "GET", "/admin/batches")).body.map((b) => b.batchId);
    assert.ok(batches.includes("W1-VID-001") && batches.includes("W1-VID-002") && batches.includes("W1-VID-003"));
  });
  it("customer cancel marks delivery cancelled and refunds payment", async () => {
    const r = await as(C1, "PUT", `/orders/${ids.orderGok}`, { orderStatus: "CANCELLED" });
    assert.equal(r.status, 200);
    assert.equal(r.body.paymentStatus, "REFUNDED");
    assert.equal(r.body.delivery.status, "CANCELLED");
    assert.equal((await as(C1, "PUT", `/orders/${ids.order1}`, { orderStatus: "PICKED_UP" })).status, 403);
  });
});

describe("seller order flow", () => {
  it("must go CONFIRMED -> PREPARING -> READY_FOR_PICKUP, and never into delivery stages", async () => {
    assert.equal((await as(PRIYA, "PUT", `/orders/${ids.order1}`, { orderStatus: "READY_FOR_PICKUP" })).status, 403);
    for (const s of ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"])
      assert.equal((await as(PRIYA, "PUT", `/orders/${ids.order1}`, { orderStatus: s })).status, 403);
    assert.equal((await as(PRIYA, "PUT", `/orders/${ids.order1}`, { orderStatus: "PREPARING" })).status, 200);
    const ready = await as(PRIYA, "PUT", `/orders/${ids.order1}`, { orderStatus: "READY_FOR_PICKUP" });
    assert.equal(ready.status, 200);
    assert.equal(ready.body.delivery.status, "READY_FOR_PICKUP"); // pickup status follows the seller
  });
  it("cannot touch another seller's order", async () => {
    assert.equal((await as(PRIYA, "PUT", `/orders/${ids.order2}`, { orderStatus: "PREPARING" })).status, 404);
    assert.equal((await as(PRIYA, "GET", `/orders/${ids.order2}`)).status, 404);
  });
});

describe("delivery partners", () => {
  const find = async (email, batchId) => (await as(email, "GET", "/delivery")).body.filter((d) => d.batchId === batchId);

  it("each partner sees only assigned deliveries", async () => {
    const rahul = (await as(RAHUL, "GET", "/delivery")).body, sunita = (await as(SUNITA, "GET", "/delivery")).body;
    const batchesOf = (list) => new Set(list.map((d) => d.batchId));
    assert.deepEqual([...batchesOf(rahul)].sort(), ["W1-VID-001", "W2-GOK-001"]);
    assert.deepEqual([...batchesOf(sunita)].sort(), ["W1-KESH-001", "W1-VID-001"]);
    assert.ok(rahul[0].seller.businessName && rahul[0].order.totalAmount);
    assert.equal((await as(RAHUL, "PUT", `/delivery/${sunita.find((d) => d.batchId === "W1-KESH-001")._id}`, { status: "OUT_FOR_DELIVERY" })).status, 404);
  });

  it("pickup partner moves only pickup stages, one step at a time", async () => {
    const [ready] = (await find(RAHUL, "W2-GOK-001")).filter((d) => d.status === "READY_FOR_PICKUP");
    const put = (status) => as(RAHUL, "PUT", `/delivery/${ready._id}`, { status });
    assert.equal((await put("DELIVERED")).status, 409);
    assert.equal((await put("AT_COLLECTION")).status, 409); // skipping PICKED_UP
    assert.equal((await put("OUT_FOR_DELIVERY")).status, 409);
    assert.equal((await put("BOGUS")).status, 400);
    const picked = await put("PICKED_UP");
    assert.equal(picked.status, 200);
    assert.equal((await as(ADMIN, "GET", `/orders/${ready.orderId}`)).body.orderStatus, "PICKED_UP");
    assert.equal((await put("AT_COLLECTION")).status, 200);
    assert.equal((await put("MID_MILE")).status, 403); // mid-mile is a platform stage
    ids.moving = ready._id;
    ids.movingOrder = ready.orderId;
  });

  it("pickup needs the seller to have marked the order ready", async () => {
    const [pending] = (await find(RAHUL, "W2-GOK-001")).filter((d) => d.status === "PENDING");
    assert.equal((await as(RAHUL, "PUT", `/delivery/${pending._id}`, { status: "PICKED_UP" })).status, 409); // skips READY_FOR_PICKUP
    assert.equal((await as(RAHUL, "PUT", `/delivery/${pending._id}`, { status: "READY_FOR_PICKUP" })).status, 200);
    const blocked = await as(RAHUL, "PUT", `/delivery/${pending._id}`, { status: "PICKED_UP" });
    assert.equal(blocked.status, 409);
    assert.match(blocked.body.message, /seller/i);
  });

  it("last-mile partner cannot do pickup-only actions", async () => {
    const [ready] = (await find(VIKRAM, "W2-GOK-001")).filter((d) => d.status === "READY_FOR_PICKUP");
    assert.ok(ready);
    assert.equal((await as(VIKRAM, "PUT", `/delivery/${ready._id}`, { status: "PICKED_UP" })).status, 403);
  });

  it("batch action moves every eligible package", async () => {
    // one package is READY_FOR_PICKUP on the delivery side but its seller is still preparing, so it must be skipped
    const waiting = (await find(RAHUL, "W2-GOK-001")).filter((d) => d.status === "READY_FOR_PICKUP");
    const before = waiting.filter((d) => d.order.orderStatus === "READY_FOR_PICKUP").length;
    assert.ok(before >= 1 && before < waiting.length);
    const r = await as(RAHUL, "PUT", "/delivery/batch/W2-GOK-001/status", { status: "PICKED_UP" });
    assert.equal(r.status, 200);
    assert.equal(r.body.updated, before);
    assert.equal(r.body.skipped, waiting.length - before);
    assert.equal((await as(SUNITA, "PUT", "/delivery/batch/W2-GOK-001/status", { status: "AT_COLLECTION" })).status, 404); // not hers
    assert.equal((await as(VIKRAM, "PUT", "/delivery/batch/W2-GOK-001/status", { status: "PICKED_UP" })).status, 403 );
  });

  it("admin simulates mid-mile, then the last-mile partner finishes", async () => {
    const mid = await as(ADMIN, "PUT", `/delivery/${ids.moving}`, { status: "MID_MILE" });
    assert.equal(mid.status, 200);
    assert.equal((await as(ADMIN, "GET", `/orders/${ids.movingOrder}`)).body.orderStatus, "IN_TRANSIT");
    assert.equal((await as(ADMIN, "PUT", `/delivery/${ids.moving}`, { status: "DELIVERED" })).status, 409);
    assert.equal((await as(VIKRAM, "PUT", `/delivery/${ids.moving}`, { status: "OUT_FOR_DELIVERY" })).status, 409); // not at destination yet
    assert.equal((await as(ADMIN, "PUT", `/delivery/${ids.moving}`, { status: "AT_DESTINATION" })).status, 200);
    assert.equal((await as(ADMIN, "GET", `/orders/${ids.movingOrder}`)).body.orderStatus, "IN_TRANSIT");
    assert.equal((await as(RAHUL, "PUT", `/delivery/${ids.moving}`, { status: "OUT_FOR_DELIVERY" })).status, 403); // pickup partner
    const out = await as(VIKRAM, "PUT", `/delivery/${ids.moving}`, { status: "OUT_FOR_DELIVERY" });
    assert.equal(out.status, 200);
    assert.equal((await as(ADMIN, "GET", `/orders/${ids.movingOrder}`)).body.orderStatus, "OUT_FOR_DELIVERY");
    assert.equal((await as(RAHUL, "PUT", `/delivery/${ids.moving}`, { status: "DELIVERED" })).status, 403);
    assert.equal((await as(VIKRAM, "PUT", `/delivery/${ids.moving}`, { status: "DELIVERED" })).status, 200);
    assert.equal((await as(ADMIN, "GET", `/orders/${ids.movingOrder}`)).body.orderStatus, "DELIVERED");
  });

  it("last-mile partner sees assigned deliveries and works the seeded destination batch", async () => {
    const kesh = await find(SUNITA, "W1-KESH-001");
    assert.equal(kesh.length, 2);
    assert.equal((await as(SUNITA, "PUT", `/delivery/${kesh[0]._id}`, { status: "DELIVERED" })).status, 409);
    assert.equal((await as(SUNITA, "PUT", "/delivery/batch/W1-KESH-001/status", { status: "OUT_FOR_DELIVERY" })).body.updated, 2);
    const done = await as(SUNITA, "PUT", `/delivery/${kesh[0]._id}`, { status: "DELIVERED" });
    assert.equal(done.status, 200);
    assert.equal(done.body.order.orderStatus, "DELIVERED");
    const left = await find(SUNITA, "W1-KESH-001");
    assert.deepEqual(left.map((d) => d.order.orderStatus).sort(), ["DELIVERED", "OUT_FOR_DELIVERY"]);
  });

  it("partners cannot edit assignments", async () => {
    const [d] = await find(RAHUL, "W1-VID-001");
    const r = await as(RAHUL, "PUT", `/delivery/${d._id}`, { pickupPartnerId: "000000000000000000000000", lastMilePartnerId: d.pickupPartnerId, destinationStop: "Elsewhere" });
    assert.equal(r.status, 200);
    assert.equal(r.body.lastMilePartnerId, d.lastMilePartnerId);
    assert.equal(r.body.destinationStop, "Vidyanagar Stop");
  });
});

describe("admin", () => {
  it("sees every delivery record", async () => {
    const all = (await as(ADMIN, "GET", "/delivery")).body;
    assert.ok(all.length >= 14);
    assert.ok(new Set(all.map((d) => d.batchId)).size >= 5);
  });

  it("shows wave and batch summaries", async () => {
    const waves = (await as(ADMIN, "GET", "/admin/waves")).body;
    assert.deepEqual(waves.map((w) => w.wave), ["2:00 PM", "5:00 PM"]);
    assert.ok(waves[0].batches >= 3 && waves[0].orders >= 8);
    assert.ok(waves[1].destinations.includes("Gokul Road Stop"));
    const batches = (await as(ADMIN, "GET", "/admin/batches")).body;
    const vid = batches.find((b) => b.batchId === "W1-VID-001");
    assert.equal(vid.orders, 5);
    assert.equal(vid.sellers, 4);
    assert.equal(vid.stage, "MID_MILE");
    assert.equal(vid.pickupPartner.name, "Rahul Kulkarni");
    assert.equal(vid.lastMilePartner.name, "Sunita Naik");
    const w1vid2 = batches.find((b) => b.batchId === "W1-VID-002");
    assert.equal(w1vid2.orders, 2);
    assert.equal(w1vid2.sellers, 2);
    const gok = batches.find((b) => b.batchId === "W1-GOK-001");
    assert.equal(gok.stage, "CANCELLED");
    assert.equal(gok.orders, 0);
    const stats = (await as(ADMIN, "GET", "/admin/stats")).body;
    assert.ok(stats.activeBatches >= 4 && stats.deliveryPartners === 3);
  });

  it("admin advances a whole batch one stage", async () => {
    const r = await as(ADMIN, "PUT", "/delivery/batch/W1-VID-001/status", { status: "AT_DESTINATION" });
    assert.equal(r.body.updated, 5);
    const vid = (await as(ADMIN, "GET", "/admin/batches")).body.find((b) => b.batchId === "W1-VID-001");
    assert.equal(vid.stage, "AT_DESTINATION");
    assert.equal((await as(ADMIN, "PUT", "/delivery/batch/W1-VID-001/status", { status: "DELIVERED" })).status, 409);
  });

  it("assigns pickup and last-mile partners to a batch and a single delivery", async () => {
    const partners = (await as(ADMIN, "GET", "/admin/partners")).body;
    assert.equal(partners.length, 3);
    const rahul = partners.find((p) => p.name === "Rahul Kulkarni"), sunita = partners.find((p) => p.name === "Sunita Naik");
    assert.equal((await as(RAHUL, "GET", "/delivery")).body.some((d) => d.batchId === "W1-VID-002"), false);

    const r = await as(ADMIN, "PUT", "/admin/batches/W1-VID-002", { pickupPartnerId: rahul._id, lastMilePartnerId: sunita._id });
    assert.equal(r.status, 200);
    assert.equal(r.body.pickupPartner.name, "Rahul Kulkarni");
    assert.equal((await as(RAHUL, "GET", "/delivery")).body.filter((d) => d.batchId === "W1-VID-002").length, 2);

    const [one] = (await as(SUNITA, "GET", "/delivery")).body.filter((d) => d.batchId === "W1-VID-002");
    const vikram = partners.find((p) => p.name === "Vikram Hegde");
    const single = await as(ADMIN, "PUT", `/delivery/${one._id}`, { lastMilePartnerId: vikram._id });
    assert.equal(single.body.lastMilePartner, "Vikram Hegde");

    // only delivery_partner users can be assigned
    const sellerUserId = (await mongoose.connection.collection("users").findOne({ email: PRIYA }))._id.toString();
    assert.equal((await as(ADMIN, "PUT", "/admin/batches/W1-VID-002", { pickupPartnerId: sellerUserId })).status, 400);
    assert.equal((await as(ADMIN, "PUT", `/delivery/${one._id}`, { pickupPartnerId: sellerUserId })).status, 400);
    assert.equal((await as(ADMIN, "PUT", "/admin/batches/NOPE-001", { pickupPartnerId: rahul._id })).status, 404);
  });

  it("new orders join a batch with its partners already assigned", async () => {
    setClock("2026-10-07T07:30:00Z");
    const r = await place(C2, ids.ananya, ids.hamper, "Vidyanagar");
    assert.equal(r.body.batchId, "W1-VID-002");
    const d = (await as(ADMIN, "GET", "/delivery")).body.find((x) => x.orderId === r.body._id);
    assert.equal(d.pickupPartner, "Rahul Kulkarni");
  });

  it("verification review still works", async () => {
    const queue = (await as(ADMIN, "GET", "/admin/verifications")).body;
    const meera = queue.find((s) => s._id === ids.meera);
    assert.ok(meera);
    assert.equal((await as(ADMIN, "PUT", `/admin/verification/${ids.meera}`, { status: "VERIFIED" })).body.verificationStatus, "VERIFIED");
    assert.equal((await as(ADMIN, "PUT", `/admin/verification/${ids.meera}`, { status: "NOPE" })).status, 400);
  });
});
