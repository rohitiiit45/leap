import { useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import Card from "./Card";
import { api } from "../services/api";

const blank = { name: "", price: "", category: "", description: "", image: null };

export default function ProductManager({ defaultCategory = "" }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const load = () => api.myProducts().then(setProducts).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  const save = async (e) => {
    e.preventDefault();
    setError("");
    const body = new FormData();
    body.append("name", form.name);
    body.append("price", String(Number(form.price)));
    body.append("category", form.category || defaultCategory);
    body.append("description", form.description);
    if (form.image) body.append("image", form.image);
    try {
      if (editing) await api.updateProduct(editing, body);
      else await api.createProduct(body);
      setForm(blank);
      setEditing(null);
      load();
    } catch (err) { setError(err.message); }
  };

  const edit = (p) => {
    setEditing(p._id);
    setForm({ name: p.name, price: String(p.price), category: p.category || "", description: p.description || "", image: null });
  };
  const toggle = async (p) => {
    try {
      if (p.available) await api.removeProduct(p._id);
      else {
        const body = new FormData();
        body.append("available", "true");
        await api.updateProduct(p._id, body);
      }
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <Card className="mt-6 p-6">
      <h2 className="font-bold">Your products</h2>
      <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-[1.4fr_.6fr_1fr_auto]">
        <input className="input" placeholder="Product name" required {...field("name")} />
        <input className="input" placeholder="Price ₹" type="number" min="0" required {...field("price")} />
        <input className="input" placeholder={`Category (${defaultCategory || "optional"})`} {...field("category")} />
        <button className="btn-primary" type="submit">{editing ? "Save" : <><Plus size={16} /> Add</>}</button>
        <input className="input sm:col-span-4" placeholder="Short description (optional)" {...field("description")} />
        <label className="block text-sm font-bold sm:col-span-4">
          Product photo
          <input className="input mt-2" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setForm({ ...form, image: e.target.files?.[0] || null })} />
          <span className="mt-1 block text-xs font-normal text-slate-500">JPG, PNG or WebP · maximum 5MB</span>
        </label>
      </form>
      {editing && <button className="mt-2 text-xs text-slate-500 underline" onClick={() => { setEditing(null); setForm(blank); }}>Cancel editing</button>}
      {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!products.length && <p className="mt-4 text-sm text-slate-500">No products yet. Add your first one above.</p>}
      <div className="mt-3 divide-y">
        {products.map((p) => (
          <div className={`flex items-center justify-between gap-3 py-3 ${p.available ? "" : "opacity-50"}`} key={p._id}>
            <div className="flex min-w-0 items-center gap-3">
              {p.image ? <img src={p.image} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <div className="h-12 w-12 rounded-xl bg-slate-100" />}
              <div><p className="text-sm font-semibold">{p.name} <span className="font-normal text-slate-500">· ₹{p.price}</span></p><p className="text-xs text-slate-500">{p.category}{p.available ? "" : " · hidden from customers"}</p></div>
            </div>
            <div className="flex gap-2"><button onClick={() => edit(p)} className="btn-secondary !px-3 !py-1.5 text-xs"><Pencil size={13} /> Edit</button><button onClick={() => toggle(p)} className="btn-secondary !px-3 !py-1.5 text-xs">{p.available ? "Remove" : "Restore"}</button></div>
          </div>
        ))}
      </div>
    </Card>
  );
}
