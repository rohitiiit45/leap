import { BadgeCheck, Clock3 } from "lucide-react";

export default function VerifiedBadge({ status = "VERIFIED", className = "" }) {
  if (status === "VERIFIED") {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ${className}`}>
        <BadgeCheck size={14} /> Verified Sakhi
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ${className}`}>
      <Clock3 size={14} /> Verification pending
    </span>
  );
}
