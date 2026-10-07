import Seller from "../models/Seller.js";

// Platform-issued business ID. Not a GSTIN and not a government ID.
export async function generateSakhiId() {
  for (let i = 0; i < 10; i++) {
    const id = `SK-HBL-${Math.floor(10000 + Math.random() * 90000)}`;
    if (!(await Seller.exists({ sakhiId: id }))) return id;
  }
  throw new Error("Could not generate a unique Sakhi ID");
}
