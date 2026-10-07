import { Link } from "react-router-dom";
const cols = [
  ["Shop", [["Marketplace", "/marketplace"], ["Festival specials", "/marketplace?cat=Festival%20Specials"], ["Local food", "/marketplace?cat=North%20Karnataka%20Food"], ["Kasuti & clothing", "/marketplace?cat=Kasuti"]]],
  ["Sell", [["Become a Sakhi", "/signup"], ["Seller login", "/login"]]],
  ["Sakhi", [["How it works", "/#how"], ["Hubballi · Dharwad · Karnataka", "/"]]]
];
export default function Footer() {
  return <footer className="mt-16 border-t border-gray-200 bg-gray-50">
    <div className="page grid gap-8 py-10 sm:grid-cols-3">
      {cols.map(([t, links]) => <div key={t}><h4 className="text-sm font-semibold">{t}</h4><div className="mt-4 grid gap-3 text-sm text-gray-600">{links.map(([l, to]) => <Link key={l} to={to} className="hover:underline">{l}</Link>)}</div></div>)}
    </div>
    <div className="border-t border-gray-200"><div className="page flex flex-col gap-1 py-5 text-sm text-gray-600 sm:flex-row sm:justify-between"><span>© 2026 Sakhi · Local businesses, powered by women</span><span>Made in Karnataka</span></div></div>
  </footer>;
}
