import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, ShoppingBag, MapPin } from "lucide-react";
import CategoryBar from "../components/CategoryBar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SellerCard from "../components/SellerCard";
import Toast from "../components/Toast";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { categorySections } from "../data/catalog";

const demoBusinesses = categorySections.flatMap(([category,,items],idx) =>
  items.map((item,j)=>({
    _id:`demo-${idx}-${j}`,
    businessName:item.by,
    category,
    image:item.image,
    emoji:item.emoji,
    location:item.place,
    rating:(4.7-(j*0.1)).toFixed(1),
    verificationStatus:"VERIFIED",
    trustScore:4.8,
    completedOrders:100+j*17,
    successfulDeliveryRate:96-j,
    description:`Women-led ${category.toLowerCase()} business serving customers across Hubballi–Dharwad.`
  }))
);
const demoProducts = categorySections.flatMap(([category,,items],idx) =>
  items.map((item,j)=>({
    _id:`demo-product-${idx}-${j}`,
    sellerId:`demo-${idx}-${j}`,
    name:item.name,
    price:Number((String(item.price).match(/[\d,]+/)||["299"])[0].replace(/,/g,"")),
    image:item.image,
    category,
    available:true
  }))
);

export default function Marketplace(){
 const {user}=useAuth();
 const [params]=useSearchParams();
 const cat=params.get("cat")||"All";
 const [sellers,setSellers]=useState([]),[products,setProducts]=useState([]),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(""),[q,setQ]=useState(""),[cart,setCart]=useState([]),[toast,setToast]=useState(null),[destination,setDestination]=useState("Vidyanagar"),[nextWave,setNextWave]=useState(null),[deliveryType,setDeliveryType]=useState("STANDARD");
 const closeToast=useCallback(()=>setToast(null),[]);
 useEffect(()=>{api.nextWave().then(setNextWave).catch(()=>{});},[]);
 useEffect(()=>{
   Promise.all([api.sellers(),api.products()]).then(([s,p])=>{setSellers(s);setProducts(p)})
   .catch(()=>{setSellers(demoBusinesses);setProducts(demoProducts);setLoadError("")})
   .finally(()=>setLoading(false))
 },[]);
 const visible=useMemo(()=>sellers.filter(s=>{
   const text=`${s.businessName} ${s.location} ${s.category}`.toLowerCase();
   const aliases={
     "Kasuti & Crafts":["Handmade Crafts","Kasuti & Crafts"],
     "North Karnataka Food":["Home Food"],
     "Festival Specials":["Gifts & Festive"]
   };
   const categoryMatch=cat==="All"||(aliases[cat]?.includes(s.category))||s.category===cat;
   return categoryMatch&&text.includes(q.toLowerCase());
 }),[sellers,q,cat]);
 const total=cart.reduce((sum,x)=>sum+x.product.price,0);
 const add=(product,seller)=>{
   if(cart.length&&cart[0].seller._id!==seller._id){setCart([{product,seller}]);setToast({message:"An order can include one Sakhi at a time. Cart restarted."});return}
   setCart([...cart,{product,seller}]);
 };
 const checkout=async()=>{
   if(!user)return setToast({type:"error",message:"Please log in as a customer to place an order."});
   if(user.role!=="customer")return setToast({type:"error",message:"Only customer accounts can place orders."});
   if(String(cart[0].seller._id).startsWith("demo-")){setCart([]);setToast({message:`Demo order placed for ₹${total}. Delivery area: ${destination}.`});return}
   try{const order=await api.createOrder({sellerId:cart[0].seller._id,destination,deliveryType,items:cart.map(x=>({productId:x.product._id,quantity:1}))});setCart([]);setToast({message:`Order placed. ${order.deliveryType === "INSTANT" ? `Instant delivery · ~${order.estimatedDeliveryMinutes} min` : `Delivery wave ${order.wave}`}. Demo payment marked as paid.`});api.nextWave().then(setNextWave).catch(()=>{})}
   catch(e){setToast({type:"error",message:e.message})}
 };
 return <><Navbar/><CategoryBar/><Toast toast={toast} onClose={closeToast}/>
 <main className="page min-h-[70vh] pb-28">
  <section className="py-8">
   <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-sakhi-600"><MapPin size={13}/> Hubballi–Dharwad</p><h1 className="display mt-2 text-3xl">{cat==="All"?"Women-owned businesses near you":cat}</h1></div><span className="text-sm text-gray-500">{visible.length} local businesses</span></div>
   <div className="relative mt-5 max-w-xl"><Search className="absolute left-4 top-3.5 text-gray-400" size={18}/><input value={q} onChange={e=>setQ(e.target.value)} className="input h-12 rounded-full pl-11" placeholder="Search businesses, products or categories"/></div>
  </section>
  {loading&&<p className="py-16 text-center text-slate-500">Loading local businesses...</p>}
  {!loading&&!visible.length&&<p className="py-16 text-center text-slate-500">No businesses match your search.</p>}
  <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
   {visible.map(s=><SellerCard key={s._id} seller={s}><div className="grid gap-2">{products.filter(p=>p.sellerId===s._id).slice(0,2).map(p=><div key={p._id} className="flex items-center justify-between rounded-xl border border-gray-200 p-3">{p.image ? <img src={p.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <span className="h-10 w-10 shrink-0 rounded-lg bg-slate-100" />}<span className="truncate pr-2 text-sm font-semibold">{p.name}</span><button onClick={()=>add(p,s)} className="shrink-0 rounded-lg bg-sakhi-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sakhi-600">Add · ₹{p.price}</button></div>)}</div></SellerCard>)}
  </div>
  {cart.length>0&&<div className="fixed bottom-5 left-1/2 z-30 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl bg-sakhi-900 p-4 text-white shadow-2xl"><div className="flex items-center justify-between gap-3"><div><p className="font-bold">{cart.length} item(s) from {cart[0].seller.businessName}</p><p className="text-sm text-sakhi-100">₹{total} · <button className="underline" onClick={()=>setCart([])}>Clear</button></p></div><button onClick={checkout} className="flex items-center gap-1 rounded-xl bg-white px-4 py-2 font-bold text-sakhi-900"><ShoppingBag size={16}/> Checkout</button></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/20 pt-3 text-sm"><label className="flex items-center gap-2">Deliver to<select value={destination} onChange={e=>setDestination(e.target.value)} className="rounded-lg bg-white px-2 py-1 text-slate-800">{(nextWave?.destinations||["Vidyanagar","Gokul Road","Keshwapur","Old Hubballi"]).map(d=><option key={d}>{d}</option>)}</select></label><label className="flex items-center gap-2">Delivery<select value={deliveryType} onChange={e=>setDeliveryType(e.target.value)} className="rounded-lg bg-white px-2 py-1 text-slate-800"><option value="STANDARD">Standard</option><option value="INSTANT">Instant · ~60 min</option></select></label>{nextWave&&deliveryType==="STANDARD"&&<span className="text-sakhi-100">{nextWave.wave}{nextWave.waveDate?` · ${nextWave.waveDate}`:""}</span>}{deliveryType==="INSTANT"&&<span className="text-sakhi-100">Instant delivery · ~60 min</span>}</div></div>}
 </main><Footer/></>;
}
