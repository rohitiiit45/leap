import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Boxes, Package, Users } from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import StatCard from "./StatCard";
import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";
import Toast from "../../components/Toast";
import { api } from "../../services/api";
import { FLOW, STAGE_LABEL } from "../../data/delivery";

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [queue, setQueue] = useState([]);
  const [waves, setWaves] = useState([]);
  const [batches, setBatches] = useState([]);
  const [partners, setPartners] = useState([]);
  const [returns, setReturns] = useState([]);
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  const load = () => {
    api.stats().then(setStats).catch(() => {});
    api.verifications().then(setQueue).catch(() => {});
    api.waves().then(setWaves).catch(() => {});
    api.batches().then(setBatches).catch(() => {});
    api.returns().then(setReturns).catch(() => {});
  };
  useEffect(() => { load(); api.partners().then(setPartners).catch(() => {}); }, []);

  const act = async (fn, message) => {
    try {
      await fn();
      setToast({ message });
    } catch (e) {
      setToast({ type: "error", message: e.message });
    }
    load();
  };
  const assign = (b, field, id) => id && act(() => api.assignBatch(b.batchId, { [field]: id }), `Partner assigned to ${b.batchId}`);
  const advance = (b) => {
    const next = FLOW[FLOW.indexOf(b.stage) + 1];
    return act(() => api.updateBatchStatus(b.batchId, next), `${b.batchId} moved to ${STAGE_LABEL[next]}`);
  };

  const review = async (id, status) => {
    await api.verify(id, { status });
    load();
  };

  return (
    <DashboardLayout eyebrow="Admin dashboard" title="Platform overview" subtitle="Monitor sellers, orders and delivery waves.">
      <Toast toast={toast} onClose={closeToast} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total sellers" value={stats.totalSellers} icon={Users} />
        <StatCard label="Verified sellers" value={stats.verifiedSellers} icon={BadgeCheck} />
        <StatCard label="Today's orders" value={stats.todayOrders} icon={Package} />
        <StatCard label="Active batches" value={stats.activeBatches} icon={Boxes} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {waves.map((w) => (
          <Card className="p-6" key={w.wave}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold">{w.wave} wave</h2>
              <span className="rounded-full bg-sakhi-50 px-3 py-1 text-xs font-bold text-sakhi-700">{w.batches} batch{w.batches === 1 ? "" : "es"} · {w.orders} orders</span>
            </div>
            <p className="mt-3 text-sm text-slate-500">{w.destinations.length ? w.destinations.join(", ") : "No destinations yet"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(w.statuses).map(([status, n]) => <span key={status} className="flex items-center gap-1.5 text-xs"><StatusBadge status={status} /> × {n}</span>)}
              {!Object.keys(w.statuses).length && <span className="text-xs text-slate-400">Nothing active</span>}
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-6">
        <h2 className="font-bold">Batches</h2>
        {!batches.length && <p className="mt-3 text-sm text-slate-500">No batches yet. They are created automatically as orders come in.</p>}
        {batches.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-slate-500"><th className="pb-3">Batch</th><th>Destination</th><th>Orders</th><th>Sellers</th><th>Pickup partner</th><th>Last-mile partner</th><th>Stage</th><th className="text-right">Action</th></tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr className="border-b align-middle last:border-0" key={b.batchId}>
                    <td className="py-4"><b>{b.batchId}</b><p className="text-xs text-slate-500">{b.wave} · {b.waveDate}</p></td>
                    <td className="text-slate-600">{b.destinationStop}<p className="text-xs text-slate-400">Route {b.routeCode}</p></td>
                    <td>{b.orders}</td>
                    <td>{b.sellers}</td>
                    {[["pickupPartnerId", b.pickupPartner], ["lastMilePartnerId", b.lastMilePartner]].map(([field, current]) => (
                      <td key={field}>
                        <select value={current?.id || ""} onChange={(e) => assign(b, field, e.target.value)} disabled={b.stage === "CANCELLED"} className="input !w-40 !py-1.5 text-xs">
                          <option value="">Unassigned</option>
                          {partners.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                      </td>
                    ))}
                    <td><StatusBadge status={b.stage} /></td>
                    <td className="text-right">
                      {!["DELIVERED", "CANCELLED"].includes(b.stage) && (
                        <button onClick={() => advance(b)} className="btn-secondary !px-3 !py-1.5 text-xs">→ {STAGE_LABEL[FLOW[FLOW.indexOf(b.stage) + 1]]}</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-slate-500">Mid-mile is simulated: advance a batch through collection, mid-mile and destination here. BRTS is a proposed integration, not a live partnership.</p>
      </Card>



      <Card className="mt-6 p-6">
        <h2 className="font-bold">Return requests</h2>
        {!returns.length && <p className="mt-3 text-sm text-slate-500">No return requests yet.</p>}
        {!!returns.length && <div className="mt-4 grid gap-3">{returns.map((r) => <div key={r._id} className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between"><div className="flex gap-3"><img src={r.photoUrl} alt="Return evidence" className="h-20 w-20 rounded-xl object-cover" /><div><p className="font-semibold">{r.orderId?.items?.map((i) => i.name).join(", ") || "Order return"}</p><p className="text-sm text-slate-500">{r.reason}</p><p className="mt-1 text-xs text-slate-400">{r.customerId?.name || "Customer"} · {r.status}</p></div></div><div className="flex gap-2"><button disabled={r.status === "APPROVED"} onClick={() => act(() => api.reviewReturn(r._id, { status: "APPROVED" }), "Return approved")} className="btn-primary !px-3 !py-1.5 text-xs">Approve</button><button disabled={r.status === "REJECTED"} onClick={() => act(() => api.reviewReturn(r._id, { status: "REJECTED" }), "Return rejected")} className="btn-secondary !px-3 !py-1.5 text-xs">Reject</button></div></div>)}</div>}
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="font-bold">Seller verification queue</h2>
        {!queue.length && <p className="mt-3 text-sm text-slate-500">All sellers are verified.</p>}
        {queue.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-slate-500"><th className="pb-3">Business</th><th>Sakhi ID</th><th>Status</th><th className="text-right">Action</th></tr>
              </thead>
              <tbody>
                {queue.map((v) => (
                  <tr className="border-b last:border-0" key={v._id}>
                    <td className="py-4 font-semibold">{v.businessName}</td>
                    <td className="text-slate-500">{v.sakhiId}</td>
                    <td><StatusBadge status={v.verificationStatus} /></td>
                    <td className="space-x-2 text-right">
                      <button onClick={() => review(v._id, "VERIFIED")} className="btn-primary !px-3 !py-1.5 text-xs">Approve</button>
                      <button onClick={() => review(v._id, "REJECTED")} className="btn-secondary !px-3 !py-1.5 text-xs">Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
