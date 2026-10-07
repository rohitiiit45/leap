import { Router } from "express";

import Delivery from "../models/Delivery.js";
import Order from "../models/Order.js";
import Seller from "../models/Seller.js";
import User from "../models/User.js";

import { auth, roles, wrap, checkId, pick } from "../middleware/auth.js";

import { FLOW, moveDelivery } from "../utils/delivery.js";
import { uploadImage } from "../middleware/upload.js";
import { uploadBuffer } from "../utils/cloudinary.js";

const r = Router();

r.param("id", checkId);

// Only admins and delivery partners can access delivery routes.
r.use(auth, roles("delivery_partner", "admin"));

const STATUSES = [...FLOW, "CANCELLED"];

/*
 * Check whether a delivery is assigned to a particular
 * delivery partner.
 */
const assignedTo = (userId) => ({
  $or: [{ pickupPartnerId: userId }, { lastMilePartnerId: userId }],
});

/*
 * Check whether the current delivery belongs to the
 * logged-in delivery partner.
 */
const isMine = (delivery, userId) => {
  return [delivery.pickupPartnerId, delivery.lastMilePartnerId].some(
    (id) => id && id.toString() === userId.toString(),
  );
};

/*
 * Get deliveries along with the related order and seller.
 *
 * This keeps the frontend simple because it receives:
 *
 * {
 *   delivery,
 *   order,
 *   seller
 * }
 *
 * together.
 */
async function withDetails(deliveries) {
  if (!deliveries.length) {
    return [];
  }

  const orderIds = deliveries
    .map((delivery) => delivery.orderId)
    .filter(Boolean);

  const sellerIds = deliveries
    .map((delivery) => delivery.sellerId)
    .filter(Boolean);

  const [orders, sellers] = await Promise.all([
    Order.find({
      _id: {
        $in: orderIds,
      },
    }).select("items totalAmount orderStatus destination"),

    Seller.find({
      _id: {
        $in: sellerIds,
      },
    }).select("businessName location"),
  ]);

  const orderById = new Map(
    orders.map((order) => [order._id.toString(), order]),
  );

  const sellerById = new Map(
    sellers.map((seller) => [seller._id.toString(), seller]),
  );

  return deliveries.map((delivery) => ({
    ...delivery.toObject(),

    order: orderById.get(delivery.orderId?.toString()) || null,

    seller: sellerById.get(delivery.sellerId?.toString()) || null,
  }));
}

/*
 * GET /api/delivery
 *
 * ADMIN:
 *   Can see every delivery.
 *
 * DELIVERY PARTNER:
 *   Can see:
 *   1. Deliveries assigned to them.
 *   2. Unassigned deliveries.
 *
 * Important:
 * Seeing an unassigned delivery does NOT give the
 * delivery partner permission to modify it.
 */
r.get(
  "/",
  wrap(async (req, res) => {
    let query = {};

    if (req.user.role === "delivery_partner") {
      query = {
        $or: [
          // Assigned as pickup partner
          {
            pickupPartnerId: req.user.userId,
          },

          // Assigned as last-mile partner
          {
            lastMilePartnerId: req.user.userId,
          },

          // Completely unassigned
          {
            pickupPartnerId: {
              $exists: false,
            },
            lastMilePartnerId: {
              $exists: false,
            },
          },

          // Explicitly stored as null
          {
            pickupPartnerId: null,
            lastMilePartnerId: null,
          },
        ],
      };
    }

    const deliveries = await Delivery.find(query).sort({
      waveDate: -1,
      wave: 1,
      batchId: 1,
      createdAt: 1,
    });

    const result = await withDetails(deliveries);

    res.json(result);
  }),
);

/*
 * POST /api/delivery/:id/package-photo
 *
 * Pickup partner must upload a package photo before
 * confirming pickup.
 */
r.post(
  "/:id/package-photo",
  uploadImage.single("photo"),
  wrap(async (req, res) => {
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        message: "Delivery not found",
      });
    }

    /*
     * Only admin or the assigned delivery partner
     * can access the delivery.
     */
    if (req.user.role !== "admin" && !isMine(delivery, req.user.userId)) {
      return res.status(404).json({
        message: "Delivery not found",
      });
    }

    /*
     * Only the pickup partner can upload the package
     * photo.
     */
    if (
      req.user.role !== "admin" &&
      !delivery.pickupPartnerId?.equals(req.user.userId)
    ) {
      return res.status(403).json({
        message: "Only the pickup partner can upload this photo",
      });
    }

    if (delivery.status !== "READY_FOR_PICKUP") {
      return res.status(409).json({
        message:
          "Package photo can only be taken when the package is ready for pickup",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Package photo is required",
      });
    }

    const uploaded = await uploadBuffer(
      req.file.buffer,
      "sakhi/delivery-packages",
    );

    delivery.packagePhotoUrl = uploaded.secure_url;

    delivery.packagePhotoTakenAt = new Date();

    delivery.packagePhotoTakenBy = req.user.userId;

    await delivery.save();

    res.json({
      message: "Package photo uploaded",
      delivery,
    });
  }),
);

/*
 * PUT /api/delivery/batch/:batchId/status
 *
 * Moves all packages in a batch that the current
 * user is allowed to move.
 *
 * Admin:
 *   Can move every delivery in the batch.
 *
 * Delivery partner:
 *   Can move only deliveries assigned to them.
 */
r.put(
  "/batch/:batchId/status",
  wrap(async (req, res) => {
    const { status } = req.body;

    if (!STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid delivery status",
      });
    }

    let query = {
      batchId: req.params.batchId,
    };

    if (req.user.role !== "admin") {
      query = {
        ...query,
        ...assignedTo(req.user.userId),
      };
    }

    const deliveries = await Delivery.find(query);

    if (!deliveries.length) {
      return res.status(404).json({
        message: "Batch not found",
      });
    }

    let updated = 0;
    let skipped = 0;
    let firstError = null;

    for (const delivery of deliveries) {
      /*
       * A delivery can only move one step forward
       * through the delivery flow.
       */
      if (FLOW.indexOf(delivery.status) !== FLOW.indexOf(status) - 1) {
        skipped++;
        continue;
      }

      const error = await moveDelivery(delivery, status, req.user);

      if (error) {
        if (!firstError) {
          firstError = error;
        }

        skipped++;
      } else {
        updated++;
      }
    }

    if (!updated) {
      return res.status(firstError?.code || 409).json({
        message:
          firstError?.message ||
          "No packages in this batch can move to that stage",
      });
    }

    res.json({
      batchId: req.params.batchId,
      status,
      updated,
      skipped,
    });
  }),
);

/*
 * PUT /api/delivery/:id
 *
 * ADMIN:
 *   Can assign/unassign delivery partners and
 *   update destination information.
 *
 * DELIVERY PARTNER:
 *   Can update the delivery status only when
 *   the delivery is assigned to them.
 */
r.put(
  "/:id",
  wrap(async (req, res) => {
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        message: "Delivery not found",
      });
    }

    /*
     * Delivery partners cannot modify deliveries
     * that are not assigned to them.
     */
    if (req.user.role !== "admin" && !isMine(delivery, req.user.userId)) {
      return res.status(403).json({
        message: "This delivery is not assigned to you",
      });
    }

    const { status } = req.body;

    if (status !== undefined && !STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid delivery status",
      });
    }

    /*
     * Only admin can change assignment and
     * destination information.
     */
    if (req.user.role === "admin") {
      Object.assign(
        delivery,
        pick(req.body, ["destinationStop", "collectionPoint"]),
      );

      /*
       * Allow admin to assign or unassign:
       *
       * pickupPartnerId
       * lastMilePartnerId
       */
      for (const [idField, nameField] of [
        ["pickupPartnerId", "pickupPartner"],
        ["lastMilePartnerId", "lastMilePartner"],
      ]) {
        if (req.body[idField] === undefined) {
          continue;
        }

        /*
         * null means remove the assignment.
         */
        if (req.body[idField] === null) {
          delivery[idField] = undefined;
          delivery[nameField] = undefined;
          continue;
        }

        const partner = await User.findOne({
          _id: req.body[idField],
          role: "delivery_partner",
        }).catch(() => null);

        if (!partner) {
          return res.status(400).json({
            message: "Delivery partner not found",
          });
        }

        delivery[idField] = partner._id;

        delivery[nameField] = partner.name;
      }

      await delivery.save();
    }

    /*
     * Move delivery status after validating the
     * user's permission.
     */
    if (status) {
      const error = await moveDelivery(delivery, status, req.user);

      if (error) {
        return res.status(error.code).json({
          message: error.message,
        });
      }
    }

    const updatedDelivery = await Delivery.findById(delivery._id);

    const result = await withDetails([updatedDelivery]);

    res.json(result[0]);
  }),
);

export default r;
