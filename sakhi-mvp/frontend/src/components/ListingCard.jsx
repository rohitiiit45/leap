import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import Img from "./Img";
export default function ListingCard({ item, to = "/marketplace" }) {
  const [liked, setLiked] = useState(false);
  return <Link to={to} className="group block w-[15.5rem] shrink-0 snap-start lg:w-auto lg:min-w-0 lg:flex-1">
    <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
      <Img src={item.image} alt={item.name} emoji={item.emoji} className="h-full w-full transition duration-500 group-hover:scale-105" />
      {item.badge && <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow">{item.badge}</span>}
      <button aria-label="Save" onClick={(e) => { e.preventDefault(); setLiked(!liked); }} className="absolute right-3 top-3"><Heart size={26} className={liked ? "fill-sakhi-500 text-sakhi-500" : "fill-black/40 text-white"} /></button>
    </div>
    <h3 className="mt-3 truncate font-semibold">{item.name}</h3>
    <p className="truncate text-sm text-gray-500">{item.by}</p>
    <p className="text-sm text-gray-500">{item.place}</p>
    <p className="mt-1 text-sm font-semibold">{item.price}</p>
  </Link>;
}
