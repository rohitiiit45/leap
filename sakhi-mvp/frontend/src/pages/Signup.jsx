import { useState } from "react";
import { Link,useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, HeartHandshake, Sparkles, Bike, Store, ShoppingBag } from "lucide-react";
import Navbar from "../components/Navbar";
import { api } from "../services/api";

const categories=["Home Food","Bakery & Sweets","Handmade Crafts","Clothing","Jewellery","Beauty & Wellness","Home & Decor","Pickles & Spices","Gifts & Festive","Plants","Other Local Businesses"];
const empty={name:"",email:"",password:"",confirm:"",businessName:"",category:categories[0],location:"",description:"",deliveryArea:"",vehicleType:"Bike",phone:""};

export default function Signup(){
 const nav=useNavigate(),[role,setRole]=useState("customer"),[f,setF]=useState(empty),[show,setShow]=useState(false),[error,setError]=useState(""),[loading,setLoading]=useState(false);
 const set=k=>e=>setF({...f,[k]:e.target.value}), seller=role==="seller", delivery=role==="delivery_partner";
 const chooseRole=v=>{setRole(v);setError("")};
 const validate=()=>{
   if(!f.name.trim()||!f.email.trim()||!f.password||!f.confirm)return"Please fill in all required fields.";
   if(!/^\S+@\S+\.\S+$/.test(f.email.trim()))return"Enter a valid email address.";
   if(f.password.length<6)return"Password must be at least 6 characters.";
   if(f.password!==f.confirm)return"Passwords do not match.";
   if(seller&&(!f.businessName.trim()||!f.category||!f.location.trim()))return"Business name, category and location are required.";
   if(delivery&&(!f.phone.trim()||!f.deliveryArea.trim()))return"Phone number and delivery area are required.";
   return"";
 };
 const submit=async e=>{
   e.preventDefault();const v=validate();if(v)return setError(v);setError("");setLoading(true);
   const body={name:f.name.trim(),email:f.email.trim(),password:f.password,role};
   if(seller)Object.assign(body,{businessName:f.businessName.trim(),category:f.category,location:f.location.trim(),description:f.description.trim()});
   if(delivery)Object.assign(body,{phone:f.phone.trim(),deliveryArea:f.deliveryArea.trim(),vehicleType:f.vehicleType});
   try{await api.register(body);nav("/login",{state:{registered:true,email:body.email.toLowerCase()}})}
   catch(err){setError(err.message==="Failed to fetch"?"Unable to reach the server. Please try again.":err.message==="Email already registered"?"An account with this email already exists.":err.message)}
   finally{setLoading(false)}
 };
 return <><Navbar/><main className="page grid min-h-[82vh] items-center py-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
   <div className="hidden lg:block">
    <span className="inline-flex items-center gap-2 rounded-full bg-sakhi-50 px-3 py-1.5 text-xs font-bold text-sakhi-700"><HeartHandshake size={14}/> Join Sakhi Hubballi–Dharwad</span>
    <h1 className="display mt-5 text-6xl leading-tight text-slate-950">{delivery?"Deliver locally. Earn with your community.":seller?"Turn your skill into a local business.":"Shop local. Support women entrepreneurs."}</h1>
    <p className="mt-5 max-w-lg leading-7 text-slate-500">{delivery?"Join the community delivery network and help move orders from women-led businesses to customers across the region.":seller?"Create a storefront for your products and reach customers across Hubballi and Dharwad.":"Create an account to discover local products, place orders and support women-led businesses."}</p>
   </div>
   <form onSubmit={submit} noValidate className="card mx-auto w-full max-w-xl p-7 sm:p-9">
    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sakhi-600 text-white">{delivery?<Bike size={20}/>:seller?<Store size={20}/>:<ShoppingBag size={20}/>}</span>
    <h1 className="mt-5 text-2xl font-bold">Create your Sakhi account</h1><p className="mt-1 text-sm text-slate-500">Choose how you want to participate in the local marketplace.</p>
    <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-1.5">
      {[["customer","Customer"],["seller","Seller / Sakhi"],["delivery_partner","Delivery Partner"]].map(([v,label])=><button type="button" key={v} onClick={()=>chooseRole(v)} className={`rounded-xl px-2 py-2.5 text-xs font-bold transition sm:text-sm ${role===v?"bg-white text-sakhi-800 shadow-sm":"text-slate-500"}`}>{label}</button>)}
    </div>
    {error&&<div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="mt-5 block text-sm font-bold">{seller?"Owner name":"Full name"}<input required className="input mt-2" placeholder="Your full name" value={f.name} onChange={set("name")}/></label>
      <label className="mt-5 block text-sm font-bold">Email<input type="email" required className="input mt-2" placeholder="you@example.com" value={f.email} onChange={set("email")}/></label>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="mt-4 block text-sm font-bold">Password<div className="relative"><input type={show?"text":"password"} required className="input mt-2 pr-10" placeholder="At least 6 characters" value={f.password} onChange={set("password")}/><button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/4 text-slate-400">{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
      <label className="mt-4 block text-sm font-bold">Confirm password<input type={show?"text":"password"} required className="input mt-2" value={f.confirm} onChange={set("confirm")}/></label>
    </div>
    {seller&&<div className="mt-5 rounded-2xl border border-sakhi-100 bg-sakhi-50/50 p-5">
      <p className="text-sm font-bold text-sakhi-900">Set up your women-led business</p>
      <div className="grid gap-4 sm:grid-cols-2">
       <label className="mt-4 block text-sm font-bold">Business name<input required className="input mt-2" placeholder="e.g. Lakshmi Home Foods" value={f.businessName} onChange={set("businessName")}/></label>
       <label className="mt-4 block text-sm font-bold">Category<select className="input mt-2" value={f.category} onChange={set("category")}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
      </div>
      <label className="mt-4 block text-sm font-bold">Location<input required className="input mt-2" placeholder="e.g. Vidyanagar, Hubballi" value={f.location} onChange={set("location")}/></label>
      <label className="mt-4 block text-sm font-bold">Business description <span className="font-normal text-slate-400">(optional)</span><textarea rows={3} className="input mt-2" placeholder="Tell customers what you make" value={f.description} onChange={set("description")}/></label>
    </div>}
    {delivery&&<div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
      <div className="flex items-center gap-2 text-blue-900"><Bike size={18}/><p className="text-sm font-bold">Delivery partner details</p></div>
      <p className="mt-1 text-xs leading-5 text-blue-800/70">Your details help Sakhi assign local delivery waves. You can manage assignments from your delivery dashboard.</p>
      <div className="grid gap-4 sm:grid-cols-2">
       <label className="mt-4 block text-sm font-bold">Phone number<input required className="input mt-2" placeholder="10-digit mobile number" value={f.phone} onChange={set("phone")}/></label>
       <label className="mt-4 block text-sm font-bold">Vehicle<select className="input mt-2" value={f.vehicleType} onChange={set("vehicleType")}><option>Bike</option><option>Scooter</option><option>Bicycle</option><option>Other</option></select></label>
      </div>
      <label className="mt-4 block text-sm font-bold">Preferred delivery area<input required className="input mt-2" placeholder="e.g. Vidyanagar, Gokul Road, Keshwapur" value={f.deliveryArea} onChange={set("deliveryArea")}/></label>
    </div>}
    <button disabled={loading} className="btn-primary mt-6 w-full">{loading?"Creating account...":"Create account"}<ArrowRight size={16}/></button>
    <p className="mt-5 text-center text-sm text-slate-500">Already have an account? <Link to="/login" className="font-bold text-sakhi-700">Log in</Link></p>
   </form>
  </main></>;
}
