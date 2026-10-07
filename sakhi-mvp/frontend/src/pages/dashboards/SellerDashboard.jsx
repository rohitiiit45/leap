import { useEffect, useState } from "react";
import { BadgeCheck, Clock3, Package, ShieldCheck, Wallet } from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import StatCard from "./StatCard";
import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";
import VerifiedBadge from "../../components/VerifiedBadge";
import ProductManager from "../../components/ProductManager";
import { STAGE_LABEL } from "../../data/delivery";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function SellerDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [seller, setSeller] = useState(null);
  const [wave, setWave] = useState(null);

  const load = () => api.orders().then(setOrders).catch(() => {});
  useEffect(() => {
    load();
    api.mySeller().then(setSeller).catch(() => {});
    api.nextWave().then(setWave).catch(() => {});
  }, []);

  const setStatus = async (id, orderStatus) => {
    await api.updateOrder(id, { orderStatus });
    load();
  };

  const revenue = orders.filter((o) => o.paymentStatus === "PAID").reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const pending = orders.filter((o) => ["CONFIRMED", "PREPARING"].includes(o.orderStatus)).length;
  const live = orders.filter((o) => o.orderStatus !== "CANCELLED");

  return (
    <DashboardLayout eyebrow="Seller dashboard" title={`Hello, ${user.name.split(" ")[0]}`} subtitle={seller?.businessName || "Your business at a glance."}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={`₹${revenue.toLocaleString("en-IN")}`} icon={Wallet} />
        <StatCard label="Orders" value={live.length} icon={Package} />
        <StatCard label="Trust score" value={seller ? `${seller.trustScore} / 5` : "—"} icon={ShieldCheck} />
        <StatCard label="Pending" value={pending} icon={Clock3} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Next delivery wave</h2>
            <span className="font-semibold text-sakhi-700">{wave?.wave || "—"}</span>
          </div>
          <div className="mt-4 rounded-xl bg-sakhi-50 p-4">
            <p className="font-semibold">Order cutoff · {wave?.wave || "—"}</p>
            <p className="mt-1 text-sm text-slate-600">Orders placed now join the {wave?.wave} wave{wave?.waveDate ? ` on ${wave.waveDate}` : ""}. Orders placed after 5:00 PM move to the next day's 2:00 PM wave.</p>
          </div>
          <h3 className="mt-7 font-bold">Recent orders</h3>
          {!orders.length && <p className="mt-3 text-sm text-slate-500">No orders yet.</p>}
          <div className="mt-2 divide-y">
            {orders.slice(0, 6).map((o) => (
              <div className="flex items-center justify-between py-3" key={o._id}>
                <div>
                  <p className="text-sm font-semibold">#{o._id.slice(-6).toUpperCase()}</p>
                  <p className="text-xs text-slate-500">₹{o.totalAmount} · {o.wave} wave · {o.batchId}</p>
                  {o.delivery && o.orderStatus !== "CANCELLED" && <p className="text-xs text-slate-500">Pickup: {STAGE_LABEL[o.delivery.status]}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={o.orderStatus} />
                  {o.orderStatus === "CONFIRMED" && <button onClick={() => setStatus(o._id, "PREPARING")} className="btn-secondary !px-3 !py-1.5 text-xs">Start preparing</button>}
                  {o.orderStatus === "PREPARING" && <button onClick={() => setStatus(o._id, "READY_FOR_PICKUP")} className="btn-secondary !px-3 !py-1.5 text-xs">Ready for pickup</button>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-bold">Sakhi identity</h2>
          <div className="mt-4 rounded-2xl bg-sakhi-800 p-5 text-white">
            <p className="text-xs text-sakhi-100">Sakhi ID</p>
            <p className="mt-1 text-xl font-bold">{seller?.sakhiId || "—"}</p>
            {seller && <div className="mt-4 flex items-center gap-2 text-sm"><BadgeCheck size={18} /> {seller.verificationStatus === "VERIFIED" ? "Verified Sakhi" : "Verification pending"}</div>}
          </div>
          {seller && (
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Status</span><VerifiedBadge status={seller.verificationStatus} /></div>
              <div className="flex justify-between"><span className="text-slate-500">Completed orders</span><b>{seller.completedOrders}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Successful deliveries</span><b>{seller.successfulDeliveryRate}%</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Repeat customers</span><b>{seller.repeatCustomers}</b></div>
            </div>
          )}
        </Card>
      </div>
      <ProductManager defaultCategory={seller?.category} />
    </DashboardLayout>
  );
}
