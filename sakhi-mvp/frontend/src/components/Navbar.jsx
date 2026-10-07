import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Flower2, Menu, Search, UserCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const item = "block px-4 py-3 text-sm hover:bg-gray-100";
  const go = (fn) => () => { setOpen(false); fn?.(); };
  return <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
    <div className="page flex h-20 items-center justify-between gap-4">
      <Link to="/" className="flex items-center gap-2 text-sakhi-500"><Flower2 size={32} /><b className="hidden text-2xl tracking-tight sm:block">sakhi</b></Link>
      <button onClick={() => nav("/marketplace")} className="flex items-center rounded-full border border-gray-300 py-2 pl-5 pr-2 text-sm shadow-soft transition hover:shadow-lift">
        <span className="font-semibold">Anything local</span><span className="mx-3 h-6 w-px bg-gray-300" /><span className="hidden font-semibold sm:block">Hubballi–Dharwad</span><span className="mx-3 hidden h-6 w-px bg-gray-300 sm:block" /><span className="hidden text-gray-500 md:block">Add a craving</span>
        <span className="ml-3 grid h-8 w-8 place-items-center rounded-full bg-sakhi-500 text-white"><Search size={15} strokeWidth={3} /></span>
      </button>
      <div className="relative flex items-center gap-2">
        <Link to="/signup" className="hidden rounded-full px-4 py-3 text-sm font-semibold hover:bg-gray-100 lg:block">Become a Sakhi</Link>
        <button aria-label="Menu" onClick={() => setOpen(!open)} className="flex items-center gap-3 rounded-full border border-gray-300 py-2 pl-4 pr-2 transition hover:shadow-lift"><Menu size={16} /><UserCircle size={30} className="text-gray-500" /></button>
        {open && <div onClick={go()} className="absolute right-0 top-14 w-56 overflow-hidden rounded-xl bg-white py-2 shadow-lift ring-1 ring-black/5">
          {user ? <><Link to={`/${user.role}`} className={`${item} font-semibold`}>Dashboard</Link><Link to="/marketplace" className={item}>Shop local</Link><hr className="my-2" /><button className={`${item} w-full text-left`} onClick={go(() => { logout(); nav("/"); })}>Log out</button></>
            : <><Link to="/login" className={`${item} font-semibold`}>Log in</Link><Link to="/signup" className={item}>Sign up</Link><hr className="my-2" /><Link to="/signup" className={item}>Become a Sakhi</Link><Link to="/marketplace" className={item}>Shop local</Link></>}
        </div>}
      </div>
    </div>
  </header>;
}
