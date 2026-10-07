import express from "express";
import cors from "cors";
import auth from "./routes/auth.js";
import sellers from "./routes/sellers.js";
import products from "./routes/products.js";
import orders from "./routes/orders.js";
import delivery from "./routes/delivery.js";
import admin from "./routes/admin.js";
import returns from "./routes/returns.js";


const app=express();
app.use(cors());
app.use(express.json());
app.get("/api/health",(req,res)=>res.json({ok:true,service:"sakhi-api"}));
app.use("/api/auth",auth);
app.use("/api/sellers",sellers);
app.use("/api/products",products);
app.use("/api/orders",orders);
app.use("/api/delivery",delivery);
app.use("/api/admin",admin);
app.use("/api/returns",returns);

app.use("/api",(req,res)=>res.status(404).json({message:"Route not found"}));
app.use((err,req,res,next)=>{
  if(err.type==="entity.parse.failed")return res.status(400).json({message:"Malformed JSON body"});
  if(err.code===11000)return res.status(409).json({message:"Duplicate value for a unique field"});
  if(err.name==="ValidationError"||err.name==="CastError")return res.status(400).json({message:err.message});
  if(err.name === "MulterError" || err.message === "Only image files are allowed") return res.status(400).json({message: err.message});
  console.error(err);
  res.status(500).json({message:"Something went wrong"});
});


export default app;
