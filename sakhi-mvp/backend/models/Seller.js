import mongoose from "mongoose";
const schema = new mongoose.Schema({
  userId:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,unique:true},
  sakhiId:{type:String,unique:true,required:true},
  businessName:{type:String,required:true},
  ownerName:String,
  category:String,
  description:String,
  location:String,
  instantDelivery:{type:Boolean,default:true},
  verificationStatus:{type:String,enum:["PENDING","UNDER_REVIEW","VERIFIED","REJECTED"],default:"PENDING"},
  trustScore:{type:Number,default:0},
  rating:{type:Number,default:0},
  completedOrders:{type:Number,default:0},
  successfulDeliveryRate:{type:Number,default:0},
  repeatCustomers:{type:Number,default:0}
},{timestamps:true});
export default mongoose.model("Seller",schema);
