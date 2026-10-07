import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "./models/User.js";
import Seller from "./models/Seller.js";
import Product from "./models/Product.js";
import Order from "./models/Order.js";
import Delivery from "./models/Delivery.js";
import { COLLECTION_POINT, todayKey } from "./utils/delivery.js";

await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sakhi");
await Promise.all([User, Seller, Product, Order, Delivery].map((m) => m.deleteMany({})));

const password = await bcrypt.hash("password", 10);
const [admin, sellerUser1, customer1, rahul, customer2, sunita, sellerUser2, sellerUser3, sellerUser4, sellerUser5, customer3, vikram] = await User.insertMany([
  { name: "Sakhi Admin", email: "admin@sakhi.demo", role: "admin" },
  { name: "Priya Sharma", email: "seller@sakhi.demo", role: "seller" },
  { name: "Demo Customer", email: "customer@sakhi.demo", role: "customer" },
  { name: "Rahul Kulkarni", email: "delivery@sakhi.demo", role: "delivery_partner" },
  { name: "Second Customer", email: "customer2@sakhi.demo", role: "customer" },
  { name: "Sunita Naik", email: "delivery2@sakhi.demo", role: "delivery_partner" },
  { name: "Ananya Rao", email: "ananya@sakhi.demo", role: "seller" },
  { name: "Meera Patil", email: "meera@sakhi.demo", role: "seller" },
  { name: "Kavita Desai", email: "kavita@sakhi.demo", role: "seller" },
  { name: "Sneha Joshi", email: "sneha@sakhi.demo", role: "seller" },
  { name: "Third Customer", email: "customer3@sakhi.demo", role: "customer" },
  { name: "Vikram Hegde", email: "delivery3@sakhi.demo", role: "delivery_partner" }
].map((u) => ({ ...u, password })));

const verified = { verificationStatus: "VERIFIED", trustScore: 4.8 };
const [priya, ananya, meera, kavita, sneha] = await Seller.insertMany([
  { userId: sellerUser1._id, sakhiId: "SK-HBL-00452", businessName: "Priya's Home Bakery", ownerName: "Priya Sharma", category: "Bakery", location: "Vidyanagar", description: "Small-batch cakes, brownies and celebration bakes.", ...verified, rating: 4.8, completedOrders: 126, successfulDeliveryRate: 98, repeatCustomers: 43 },
  { userId: sellerUser2._id, sakhiId: "SK-HBL-00453", businessName: "Ananya Handmade Crafts", ownerName: "Ananya Rao", category: "Handmade Crafts", location: "Keshwapur", description: "Handmade gifting and home decor.", ...verified, trustScore: 4.9, rating: 4.9, completedOrders: 91, successfulDeliveryRate: 97, repeatCustomers: 31 },
  { userId: sellerUser3._id, sakhiId: "SK-HBL-00454", businessName: "Meera Home Foods", ownerName: "Meera Patil", category: "Home Food", location: "Gokul Road", description: "Homestyle snacks and ready-to-eat food.", verificationStatus: "PENDING", trustScore: 0, rating: 4.7 },
  { userId: sellerUser4._id, sakhiId: "SK-HBL-00455", businessName: "Kavita's Boutique", ownerName: "Kavita Desai", category: "Clothing", location: "Gokul Road", description: "Hand-stitched kurtis and blouses.", ...verified, trustScore: 4.7, rating: 4.7, completedOrders: 64, successfulDeliveryRate: 96, repeatCustomers: 22 },
  { userId: sellerUser5._id, sakhiId: "SK-HBL-00456", businessName: "Sneha Pickles & Pantry", ownerName: "Sneha Joshi", category: "Home Food", location: "Old Hubballi", description: "Small-batch pickles, chutney powders and masalas.", ...verified, trustScore: 4.6, rating: 4.6, completedOrders: 58, successfulDeliveryRate: 95, repeatCustomers: 19 }
]);

const [cake, brownie, hamper, macrame, snack, kurti, blouse, pickle] = await Product.insertMany([
  { sellerId: priya._id, name: "Chocolate Truffle Cake", description: "Eggless 1 kg celebration cake.", price: 500, category: "Bakery" },
  { sellerId: priya._id, name: "Brownie Box", description: "Six fudgy brownies.", price: 280, category: "Bakery" },
  { sellerId: ananya._id, name: "Handmade Gift Hamper", description: "Curated local craft hamper.", price: 650, category: "Handmade Crafts" },
  { sellerId: ananya._id, name: "Macrame Wall Art", description: "Handmade neutral-tone decor.", price: 450, category: "Handmade Crafts" },
  { sellerId: meera._id, name: "Homemade Snack Box", description: "Assorted local snacks.", price: 220, category: "Home Food" },
  { sellerId: kavita._id, name: "Cotton Kurti", description: "Hand-stitched cotton kurti.", price: 800, category: "Clothing" },
  { sellerId: kavita._id, name: "Silk Blouse Piece", description: "Stitched silk blouse.", price: 600, category: "Clothing" },
  { sellerId: sneha._id, name: "Mango Pickle (500 g)", description: "Traditional home-style mango pickle.", price: 240, category: "Home Food" }
]);

// Order status shown to the customer for each delivery stage.
const orderStatusFor = { PENDING: "PREPARING", READY_FOR_PICKUP: "READY_FOR_PICKUP", PICKED_UP: "PICKED_UP", AT_COLLECTION: "PICKED_UP", MID_MILE: "IN_TRANSIT", AT_DESTINATION: "IN_TRANSIT", OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY", DELIVERED: "DELIVERED" };
const today = todayKey();

// [batch, wave, route, destination, pickup partner, last-mile partner]
const batches = [
  { batchId: "W1-VID-001", wave: "2:00 PM", routeCode: "VID", destination: "Vidyanagar", pickup: rahul, lastMile: sunita, status: "MID_MILE", lines: [
    [customer1, priya, cake, 1], [customer2, priya, brownie, 2], [customer3, ananya, macrame, 1], [customer1, kavita, kurti, 1], [customer2, sneha, pickle, 2]
  ] },
  { batchId: "W1-KESH-001", wave: "2:00 PM", routeCode: "KESH", destination: "Keshwapur", pickup: vikram, lastMile: sunita, status: "AT_DESTINATION", lines: [
    [customer3, priya, brownie, 1], [customer1, sneha, pickle, 1]
  ] },
  { batchId: "W2-GOK-001", wave: "5:00 PM", routeCode: "GOK", destination: "Gokul Road", pickup: rahul, lastMile: vikram, lines: [
    [customer2, priya, cake, 1, "READY_FOR_PICKUP"], [customer3, ananya, hamper, 1, "READY_FOR_PICKUP"], [customer1, kavita, blouse, 1, "PENDING"]
  ] }
];

for (const b of batches) {
  for (const [customer, seller, product, quantity, stage] of b.lines) {
    const status = stage || b.status;
    const line = { productId: product._id, name: product.name, price: product.price, quantity };
    const order = await Order.create({
      customerId: customer._id, sellerId: seller._id, items: [line], totalAmount: product.price * quantity, destination: b.destination,
      paymentStatus: "PAID", orderStatus: orderStatusFor[status], wave: b.wave, waveDate: today, batchId: b.batchId
    });
    await Delivery.create({
      orderId: order._id, sellerId: seller._id, wave: b.wave, waveDate: today, batchId: b.batchId, routeCode: b.routeCode,
      pickupArea: seller.location, collectionPoint: COLLECTION_POINT, destinationStop: `${b.destination} Stop`,
      pickupPartnerId: b.pickup._id, pickupPartner: b.pickup.name, lastMilePartnerId: b.lastMile._id, lastMilePartner: b.lastMile.name, status
    });
  }
}

console.log("Seed complete. Demo password: password");
await mongoose.disconnect();
