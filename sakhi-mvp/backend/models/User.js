import mongoose from "mongoose";
const schema = new mongoose.Schema({
  name:{type:String,required:true},
  email:{type:String,required:true,unique:true,lowercase:true},
  password:{type:String,required:true},
  phone:{type:String},
  deliveryArea:{type:String},
  vehicleType:{type:String},
  role:{type:String,enum:["admin","seller","customer","delivery_partner"],default:"customer"}
},{timestamps:true});
export default mongoose.model("User",schema);
