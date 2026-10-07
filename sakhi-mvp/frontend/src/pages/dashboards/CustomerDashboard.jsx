import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, MapPin, Truck, XCircle } from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";
import LocationMap from "../../components/LocationMap";
import { api } from "../../services/api";
import { STAGE_LABEL } from "../../data/delivery";

const steps = ["Order confirmed", "Seller preparing", "Ready for pickup", "Picked up", "At collection point", "Mid-mile", "Reached destination stop", "Out for delivery", "Delivered"];
const orderStep = { CONFIRMED: 0, PREPARING: 1, READY_FOR_PICKUP: 2 };
const deliveryStep = { PICKED_UP: 3, AT_COLLECTION: 4, MID_MILE: 5, AT_DESTINATION: 6, OUT_FOR_DELIVERY: 7, DELIVERED: 8 };
const currentStep = (o) => deliveryStep[o.delivery?.status] ?? orderStep[o.orderStatus] ?? 0;

export default function CustomerDashboard() {
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [returnOrder, setReturnOrder] = useState(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnPhoto, setReturnPhoto] = useState(null);
  const [returnError, setReturnError] = useState("");
  const [returnLoading, setReturnLoading] = useState(false);
  const load = () => api.orders().then(setOrders).catch(() => {}).finally(() => setLoaded(true));
  useEffect(() => { load(); }, []);

  const submitReturn = async () => {
    if (!returnReason.trim()) return setReturnError("Please enter a return reason.");
    if (!returnPhoto) return setReturnError("Please upload a clear product photo.");
    setReturnLoading(true); setReturnError("");
    try {
      const form = new FormData();
      form.append("reason", returnReason.trim());
      form.append("photo", returnPhoto);
      await api.createReturn(returnOrder._id, form);
      setReturnOrder(null); setReturnReason(""); setReturnPhoto(null); load();
    } catch (e) { setReturnError(e.message); }
    finally { setReturnLoading(false); }
  };

  return (
    <DashboardLayout eyebrow="Customer dashboard" title="Your orders" subtitle="Track every order from Sakhi to doorstep.">
      <div className="grid gap-5 lg:grid-cols-2">
        {orders.map((o) => {
          const cancelled = o.orderStatus === "CANCELLED";
          const current = currentStep(o);
          const stage = o.delivery ? STAGE_LABEL[o.delivery.status] : STAGE_LABEL[o.orderStatus] || o.orderStatus;
          return (
            <Card className="p-6" key={o._id}>
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">ORDER #{o._id.slice(-6).toUpperCase()}</p><h2 className="mt-1 text-lg font-bold">{o.seller?.businessName || "Sakhi order"}</h2><p className="mt-1 text-sm text-slate-500">{o.items?.map((i) => `${i.name}${i.quantity > 1 ? ` × ${i.quantity}` : ""}`).join(", ")}</p><p className="mt-1 font-bold">₹{o.totalAmount}</p></div><StatusBadge status={o.orderStatus} /></div>
              {cancelled ? <div className="mt-6 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700"><XCircle size={20} /> This order was cancelled{o.paymentStatus === "REFUNDED" ? " and the payment refunded (demo)." : "."}</div> : <ol className="mt-6 space-y-3">{steps.map((label, i) => { const done = i < current || current === steps.length - 1; const active = i === current && !done; return <li key={label} className="flex items-center gap-3 text-sm"><span className={`grid h-5 w-5 place-items-center rounded-full ${done ? "bg-sakhi-600 text-white" : active ? "border-2 border-sakhi-600 bg-white" : "bg-slate-200"}`}>{done ? <Check size={12} /> : active && <span className="h-2 w-2 rounded-full bg-sakhi-600" />}</span><span className={done ? "font-semibold" : active ? "font-bold text-sakhi-700" : "text-slate-400"}>{label}</span></li>; })}</ol>}
              <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-sakhi-50 p-4 text-sm"><div><p className="text-xs text-slate-500">Delivery type</p><b>{o.deliveryType === "INSTANT" ? "Instant" : "Standard"}</b>{o.estimatedDeliveryMinutes && <span className="text-xs text-slate-500"> · ~{o.estimatedDeliveryMinutes} min</span>}</div><div><p className="text-xs text-slate-500">Batch</p><b>{o.batchId}</b></div><div><p className="text-xs text-slate-500">Current stage</p><b>{stage}</b></div><div><p className="text-xs text-slate-500">Destination</p><b className="flex items-center gap-1"><MapPin size={13} /> {o.delivery?.destinationStop || o.destination}</b></div></div>
              {!cancelled && <div className="mt-4"><LocationMap destination={o.destination} className="h-56" /></div>}
              {o.orderStatus === "DELIVERED" && <button onClick={() => { setReturnOrder(o); setReturnError(""); setReturnReason(""); setReturnPhoto(null); }} className="btn-secondary mt-4 w-full">Request return with photo</button>}
              {!cancelled && current >= 5 && current < 8 && <p className="mt-3 text-xs text-slate-500">Mid-mile movement is simulated in this MVP.</p>}
            </Card>
          );
        })}
      </div>
      {loaded && !orders.length && <Card className="p-10 text-center"><Truck className="mx-auto text-sakhi-500" /><h2 className="mt-3 font-bold">No orders yet</h2><p className="mt-1 text-sm text-slate-500">Explore the marketplace to place your first order.</p><Link to="/marketplace" className="btn-primary mt-5">Browse businesses</Link></Card>}

      {returnOrder && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Request return</h2><button onClick={() => setReturnOrder(null)} className="text-slate-400">✕</button></div><p className="mt-2 text-sm text-slate-500">Upload a clear photo showing the problem with the delivered product.</p><textarea className="input mt-5 min-h-28" placeholder="Why do you want to return this product?" value={returnReason} onChange={(e) => setReturnReason(e.target.value)} /><input className="input mt-4" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setReturnPhoto(e.target.files?.[0] || null)} />{returnError && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{returnError}</p>}<button disabled={returnLoading} onClick={submitReturn} className="btn-primary mt-5 w-full">{returnLoading ? "Uploading..." : "Submit return request"}</button></div></div>}
    </DashboardLayout>
  );
}
