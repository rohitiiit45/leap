import mongoose from "mongoose";

const schema = new mongoose.Schema({
  orderId:{type:mongoose.Schema.Types.ObjectId,ref:"Order",required:true,index:true},
  customerId:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
  sellerId:{type:mongoose.Schema.Types.ObjectId,ref:"Seller",required:true},
  reason:{type:String,required:true,maxlength:500},
  photoUrl:{type:String,required:true},
  status:{type:String,enum:["REQUESTED","APPROVED","REJECTED","COMPLETED"],default:"REQUESTED"},
  adminNote:String
},{timestamps:true});

export default mongoose.model("ReturnRequest",schema);
