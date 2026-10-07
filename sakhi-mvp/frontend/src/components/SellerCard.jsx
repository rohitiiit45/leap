import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import Img from "./Img";
import VerifiedBadge from "./VerifiedBadge";
import { CAT_IMG, IMG } from "../data/catalog";
export default function SellerCard({ seller, children }) {
  const [src, emoji] = seller.image ? [seller.image, seller.emoji] : CAT_IMG[seller.category] || [IMG.village, "🌸"];
  return <div className="group">
    <Link to={`/sellers/${seller._id}`} className="block">
      <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100"><Img src={src} alt={seller.businessName} emoji={emoji} className="h-full w-full transition duration-500 group-hover:scale-105" /></div>
      <div className="mt-3 flex items-start justify-between gap-2"><h3 className="truncate font-semibold">{seller.businessName}</h3><span className="flex shrink-0 items-center gap-1 text-sm"><Star size={13} className="fill-current" />{Number(seller.rating).toFixed(1)}</span></div>
      <p className="text-sm text-gray-500">{seller.category} · {seller.location}</p>
      <div className="mt-2"><VerifiedBadge status={seller.verificationStatus} /></div>
    </Link>
    {children && <div className="mt-3">{children}</div>}
  </div>;
}
