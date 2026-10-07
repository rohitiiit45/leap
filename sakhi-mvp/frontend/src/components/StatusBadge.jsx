const green = "bg-emerald-50 text-emerald-700 border-emerald-200";
const amber = "bg-amber-50 text-amber-700 border-amber-200";
const blue = "bg-blue-50 text-blue-700 border-blue-200";
const red = "bg-red-50 text-red-700 border-red-200";

const tones = {
  VERIFIED: green, PAID: green, DELIVERED: green,
  PENDING: amber, PREPARING: amber, CONFIRMED: amber,
  UNDER_REVIEW: blue, READY_FOR_PICKUP: blue, PICKED_UP: blue, IN_TRANSIT: blue, OUT_FOR_DELIVERY: blue,
  AT_COLLECTION: blue, MID_MILE: blue, AT_DESTINATION: blue,
  REJECTED: red, CANCELLED: red, FAILED: red
};

export default function StatusBadge({ status }) {
  const tone = tones[status] || "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {String(status || "—").replaceAll("_", " ")}
    </span>
  );
}
