import { Link, useLocation } from "react-router-dom";
import { Cookie, Gift, PartyPopper, Scissors, Shirt, Utensils, Sparkles, Gem, Home, Sprout, Heart } from "lucide-react";
const cats = [
  ["Festival Specials", PartyPopper], ["Home Food", Utensils], ["Bakery & Sweets", Cookie],
  ["Kasuti & Crafts", Scissors], ["Clothing", Shirt], ["Jewellery", Gem],
  ["Beauty & Wellness", Sparkles], ["Home & Decor", Home], ["Pickles & Spices", Heart],
  ["Gifts & Festive", Gift], ["Plants", Sprout]
];
export default function CategoryBar() {
  const active = new URLSearchParams(useLocation().search).get("cat");
  return <div className="sticky top-20 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
    <div className="page no-scrollbar flex gap-7 overflow-x-auto">
      {cats.map(([c,I]) => <Link key={c} to={`/marketplace?cat=${encodeURIComponent(c)}`}
        className={`flex shrink-0 flex-col items-center gap-2 border-b-2 pb-3 pt-4 text-[11px] font-semibold transition ${active===c?"border-gray-900 text-gray-900":"border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900"}`}>
        <I size={23}/>{c}
      </Link>)}
    </div>
  </div>;
}
