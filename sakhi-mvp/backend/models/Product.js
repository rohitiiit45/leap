import mongoose from "mongoose";
const schema = new mongoose.Schema({
  sellerId:{type:mongoose.Schema.Types.ObjectId,ref:"Seller",required:true},
  name:{type:String,required:true},
  description:String,
  price:{type:Number,required:true,min:0},
  image:String,
  category:String,
  available:{type:Boolean,default:true}
},{timestamps:true});
export default mongoose.model("Product",schema);
