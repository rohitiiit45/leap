import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, BadgeCheck, HeartHandshake, Truck, MapPin } from "lucide-react";
import Navbar from "../components/Navbar";
import CategoryBar from "../components/CategoryBar";
import Footer from "../components/Footer";
import ListingCard from "../components/ListingCard";
import Img from "../components/Img";
import { IMG, festive, categorySections } from "../data/catalog";

const Row = ({title,sub,items,cat}) => <section className="page pt-12">
  <div className="flex items-end justify-between gap-4">
    <div><h2 className="text-2xl font-bold">{title}</h2><p className="mt-1 text-gray-500">{sub}</p></div>
    <Link to={`/marketplace?cat=${encodeURIComponent(cat)}`} className="hidden items-center gap-1 text-sm font-semibold underline sm:flex">Show all <ArrowRight size={14}/></Link>
  </div>
  <div className="no-scrollbar mt-5 flex snap-x gap-6 overflow-x-auto pb-2">{items.map(i=><ListingCard key={i.name} item={i} to={`/marketplace?cat=${encodeURIComponent(cat)}`}/>)}</div>
</section>;

const how=[
  [HeartHandshake,"Discover","Find women-owned businesses across Hubballi and Dharwad."],
  [BadgeCheck,"Shop with trust","Choose local makers, verified sellers and transparent prices."],
  [Truck,"Get it delivered","Community delivery brings your order from maker to your doorstep."]
];

export default function Home(){
 const {hash}=useLocation(); useEffect(()=>{if(hash)document.querySelector(hash)?.scrollIntoView()},[hash]);
 return <>
  <div className="bg-sakhi-900 px-4 py-2 text-center text-xs sm:text-sm text-white">🌸 <b>Sakhi Local</b> — discover women-led businesses in Hubballi–Dharwad. <Link className="underline" to="/marketplace">Explore local</Link></div>
  <Navbar/><CategoryBar/>
  <main>
   <section className="page pt-7">
    <div className="relative overflow-hidden rounded-[2rem] bg-gray-900 text-white">
      <Img src={IMG.ganesh} alt="Local crafts and festive products" emoji="🌸" className="absolute inset-0 h-full w-full opacity-65"/>
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent"/>
      <div className="relative flex min-h-[500px] items-end p-7 sm:p-14">
       <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-gray-900"><MapPin size={14}/> Hubballi–Dharwad</span>
        <h1 className="display mt-5 text-4xl sm:text-6xl">Local businesses. Women who make it happen.</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-white/85 sm:text-lg">Shop food, fashion, crafts, beauty and everyday products made by women entrepreneurs from your region.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/marketplace" className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-gray-900 hover:bg-gray-100">Explore businesses</Link>
          <Link to="/signup" className="rounded-xl border border-white/70 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur hover:bg-white/20">Start selling</Link>
        </div>
       </div>
      </div>
    </div>
    <div className="no-scrollbar mt-8 flex snap-x gap-6 overflow-x-auto">{festive.map(i=><ListingCard key={i.name} item={i} to="/marketplace?cat=Gifts%20%26%20Festive"/>)}</div>
   </section>
   {categorySections.map(([cat,sub,items])=><Row key={cat} title={cat} sub={sub} items={items} cat={cat}/>)}
   <section id="how" className="page pt-16">
    <h2 className="text-2xl font-bold">How Sakhi works</h2>
    <div className="mt-6 grid gap-8 sm:grid-cols-3">{how.map(([I,t,d])=><div key={t}><I className="text-sakhi-500" size={30}/><h3 className="mt-3 font-semibold">{t}</h3><p className="mt-1 text-sm leading-6 text-gray-500">{d}</p></div>)}</div>
   </section>
   <section className="page pt-16">
    <div className="grid overflow-hidden rounded-[2rem] bg-gray-100 md:grid-cols-2">
      <div className="p-8 sm:p-14"><p className="text-sm font-bold text-sakhi-600">FOR WOMEN ENTREPRENEURS</p><h2 className="display mt-2 text-3xl sm:text-4xl">Your skill can become a local business.</h2><p className="mt-4 leading-7 text-gray-600">Create your Sakhi profile, list products and reach customers across Hubballi–Dharwad.</p><Link to="/signup" className="btn-primary mt-7">Become a Sakhi <ArrowRight size={16}/></Link></div>
      <Img src={IMG.founder} alt="Woman entrepreneur" emoji="🧵" className="h-72 w-full md:h-full"/>
    </div>
   </section>
   <section className="page py-16"><div className="rounded-3xl border border-gray-200 p-7 sm:p-10"><h2 className="display text-2xl">Local delivery, built into Sakhi</h2><p className="mt-2 max-w-2xl text-gray-500">Customers can select a delivery area at checkout, while delivery partners get their own account and dashboard to manage community delivery waves.</p><Link to="/signup" className="mt-5 inline-flex font-bold underline">Join as a delivery partner →</Link></div></section>
  </main><Footer/>
 </>;
}
