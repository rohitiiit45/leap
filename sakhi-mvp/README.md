# SAKHI

**Local businesses. Powered by women.**

Sakhi is a hyperlocal commerce MVP for women-run home businesses. It combines a platform-issued seller identity (Sakhi ID), admin verification, trust signals, a marketplace, and a batch delivery model built around two fixed daily waves.

## Stack

- Frontend: React, Vite, JavaScript, Tailwind CSS, React Router, Lucide
- Backend: Node.js, Express, JWT, bcrypt
- Database: MongoDB with Mongoose

## Roles

| Role | What they do |
|---|---|
| `customer` | Browse sellers, order, track the delivery journey |
| `seller` | Manage products, prepare orders, see next wave and pickup status |
| `delivery_partner` | Pickup partner or last-mile partner, working on assigned batches |
| `admin` | Verify sellers, assign partners, monitor waves and batches, run the simulated mid-mile |

Public registration only creates `customer` and `seller` accounts. Admins and delivery partners come from the seed or the platform.

## Sakhi ID and verification

- A **Sakhi ID** (e.g. `SK-HBL-00452`) is a platform-issued business identity. It is **not** a GSTIN, does not replace GST, and makes no legal or tax claim.
- **Verified Sakhi** is an admin approval in this MVP. Only verified sellers can take orders. No Aadhaar or other government ID numbers are stored.
- Sakhi ID, verification status and trust score are platform-controlled; sellers cannot edit them.

## Delivery model

Sakhi uses **batch delivery in two fixed waves**, not one rider per order.

- Waves: **2:00 PM** and **5:00 PM**.
- The **server** picks the wave, in India time (Asia/Kolkata): before 2:00 PM → 2:00 PM wave; 2:00–5:00 PM → 5:00 PM wave; after 5:00 PM → next day's 2:00 PM wave. A wave sent by the browser is ignored.
- Each order is routed by destination area (Vidyanagar `VID`, Gokul Road `GOK`, Keshwapur `KESH`, Old Hubballi `OLDH`).
- Orders for the same wave, day and route share a **batch** (`W1-VID-001`, `W1-VID-002`, ...) until pickup starts. Batches are derived from delivery records; there is no separate Batch model.

Journey of a package:

1. **Seller** prepares the order (`CONFIRMED → PREPARING → READY_FOR_PICKUP`).
2. **Pickup partner** (local) collects from several Sakhis (`PENDING → READY_FOR_PICKUP → PICKED_UP → AT_COLLECTION`).
3. **Collection point** consolidates the batch.
4. **Mid-mile** moves it towards the destination area (`MID_MILE`). **BRTS is a proposed integration, not an existing partnership.** In this MVP the mid-mile is simulated: an admin advances the batch.
5. **Destination stop** (`AT_DESTINATION`).
6. **Last-mile partner** (a different local partner) delivers (`OUT_FOR_DELIVERY → DELIVERED`).

Rules enforced by the API: statuses move one step at a time; pickup partners can only do the pickup steps, last-mile partners only the last-mile steps; the seller must have marked an order ready before it can be picked up; seller order statuses never include delivery stages. A partner only sees deliveries where they are the assigned pickup or last-mile partner.

Order status shown to customers follows the delivery: picked up / at collection → `PICKED_UP`; mid-mile / at destination → `IN_TRANSIT`; then `OUT_FOR_DELIVERY` and `DELIVERED`.

## Setup

Requirements: Node 18+ and a MongoDB server (local or Atlas).

```bash
# backend
cd backend
cp .env.example .env     # set MONGO_URI and a long random JWT_SECRET
npm install
npm run seed
npm run dev              # http://localhost:5000

# frontend (new terminal)
cd frontend
cp .env.example .env     # only needed if the API is not on localhost:5000
npm install
npm run dev              # http://localhost:5173
```

`backend/.env` holds all secrets (`JWT_SECRET` is required; Razorpay and Cloudinary keys are placeholders and unused). The frontend only needs `VITE_API_URL`. Never commit `.env` files.

Tests (need a running MongoDB; they use a separate `sakhi_test` database and wipe it):

```bash
cd backend
TEST_MONGO_URI=mongodb://127.0.0.1:27017/sakhi_test npm test
```

## Demo accounts

Password for all: `password`

| Role | Email |
|---|---|
| Admin | admin@sakhi.demo |
| Seller (Priya's Home Bakery) | seller@sakhi.demo |
| Other sellers | ananya@, kavita@, sneha@sakhi.demo (verified); meera@sakhi.demo (pending, for the verification queue) |
| Customers | customer@, customer2@, customer3@sakhi.demo |
| Pickup partner | delivery@sakhi.demo (Rahul) |
| Last-mile partner | delivery2@sakhi.demo (Sunita) |
| Both roles in different batches | delivery3@sakhi.demo (Vikram) |

Seeded batches: `W1-VID-001` (2 PM, 5 orders, 4 sellers, mid-mile), `W1-KESH-001` (2 PM, at destination, ready for last mile), `W2-GOK-001` (5 PM, 3 sellers, pickup in progress).

## Account creation

- Customers and sellers can sign up at `/signup`. Seller signup also creates the seller profile and Sakhi ID.
- Admins and delivery partners are platform-created (seed/admin) and cannot self-register.
- After signup you are sent to `/login` with your email prefilled; log in normally to reach your dashboard.

## API overview

- `POST /api/auth/register|login`
- `GET /api/sellers`, `GET /api/products`, `GET|POST|PUT|DELETE /api/products` (seller: own only), `GET /api/products/mine`
- `GET /api/orders/next-wave`, `POST|GET|PUT /api/orders`
- `GET /api/delivery`, `PUT /api/delivery/:id` (status; admin also assigns partners), `PUT /api/delivery/batch/:batchId/status`
- `GET /api/admin/stats|waves|batches|partners|verifications`, `PUT /api/admin/batches/:batchId` (assign partners), `PUT /api/admin/verification/:id`

## Limitations

- Payment is simulated (orders are marked `PAID`; cancelling marks them `REFUNDED`). No Razorpay flow.
- Verification is a simple admin approve/reject; trust score is a platform signal, not a certification.
- Mid-mile is simulated and BRTS is only a proposal. There is no external transport API.
- No customer addresses or proof-of-delivery; destinations are fixed Hubballi areas.
- Batch numbering is not safe against two simultaneous first orders for the same wave and route (they could get the same batch ID). A counter collection would fix this.
- Image uploads are not implemented. Route visualisation is a stage strip, not a live map.
- Not hardened for production (rate limiting, HTTPS, token storage, audit logs).

## Updated media, delivery and admin setup

The updated project adds:

- Cloudinary product image uploads for sellers.
- Customer return requests with mandatory evidence photos.
- Delivery package photos before pickup confirmation.
- Standard and Instant delivery order types.
- Leaflet + OpenStreetMap delivery-area maps.
- Backend-enforced JWT role checks and platform-controlled admin credentials.
- Admin return-request review.

### Backend environment

Copy `backend/.env.example` to `backend/.env` and fill in your existing MongoDB, JWT and Cloudinary values. Razorpay can remain blank until payment integration is enabled.

Also set:

```env
ADMIN_EMAIL=your-admin-email
ADMIN_PASSWORD=your-admin-password
```

Do not put these admin credentials in frontend code.

### Install

```bash
cd backend
npm install
npm run dev
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend uses `VITE_API_URL=http://localhost:5000/api` by default.
