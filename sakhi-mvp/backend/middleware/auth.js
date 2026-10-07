import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Seller from "../models/Seller.js";

export function auth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) return res.status(401).json({ message: "Authentication required" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function roles(...allowed) {
  return (req, res, next) =>
    allowed.includes(req.user.role) ? next() : res.status(403).json({ message: "Forbidden" });
}

// Express 4 does not catch rejected promises, so async handlers go through this.
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// router.param("id", checkId) rejects malformed ObjectIds with a 400.
export function checkId(req, res, next, id) {
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });
  next();
}

export const sellerForUser = (userId) => Seller.findOne({ userId });

export function pick(body, fields) {
  return Object.fromEntries(fields.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));
}
