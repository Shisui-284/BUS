import { formatStatusLabel } from "../../utils/constants";

interface StatusBadgeProps {
  status: string;
}

const STATUS_CLASS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800 border border-blue-200",
  RUNNING: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  COMPLETED: "bg-slate-100 text-slate-700 border border-slate-200",
  CANCELLED: "bg-red-100 text-red-800 border border-red-200",
  DELAYED: "bg-amber-100 text-amber-800 border border-amber-200",
  AVAILABLE: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  MAINTENANCE: "bg-red-100 text-red-800 border border-red-200",
  BOOKED: "bg-amber-100 text-amber-800 border border-amber-200",
  PAID: "bg-emerald-100 text-emerald-800 border border-emerald-200",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const label = formatStatusLabel(status);
  const className =
    STATUS_CLASS[status] ??
    "bg-slate-100 text-slate-700 border border-slate-200";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${className}`}
    >
      {label}
    </span>
  );
}
