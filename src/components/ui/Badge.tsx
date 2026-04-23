import { STATUS_COLORS } from "../../utils/constants";

interface BadgeProps {
  status: string;
  label?: string;
}

export default function Badge({ status, label }: BadgeProps) {
  const colorClass =
    STATUS_COLORS[status] ??
    "bg-slate-100 text-slate-700 border border-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${colorClass}`}
    >
      {label ?? status}
    </span>
  );
}
