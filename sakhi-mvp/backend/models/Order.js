import mongoose from "mongoose";
const schema = new mongoose.Schema({
  customerId:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
  sellerId:{type:mongoose.Schema.Types.ObjectId,ref:"Seller",required:true},
  items:Array,
  totalAmount:Number,
  paymentStatus:{type:String,enum:["PENDING","PAID","FAILED","REFUNDED"],default:"PENDING"},
  orderStatus:{type:String,enum:["CONFIRMED","PREPARING","READY_FOR_PICKUP","PICKED_UP","IN_TRANSIT","OUT_FOR_DELIVERY","DELIVERED","CANCELLED"],default:"CONFIRMED"},
  deliveryType:{type:String,enum:["STANDARD","INSTANT"],default:"STANDARD"},
  estimatedDeliveryMinutes:{type:Number,default:null},
  destination:String,
  wave:String,
  waveDate:String,
  batchId:String
},{timestamps:true});
export default mongoose.model("Order",schema);
