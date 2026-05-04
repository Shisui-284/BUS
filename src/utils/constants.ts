import { BusStatus, TicketStatus, TripStatus, UserRole } from "../types";

export const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800 border-blue-200",
  RUNNING: "bg-emerald-100 text-emerald-800 border-emerald-200",
  COMPLETED: "bg-slate-100 text-slate-700 border-slate-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
  DELAYED: "bg-amber-100 text-amber-800 border-amber-200",
  AVAILABLE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  MAINTENANCE: "bg-red-100 text-red-800 border-red-200",
  BOOKED: "bg-amber-100 text-amber-800 border-amber-200",
  PAID: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "ADMIN",
  CUSTOMER: "CUSTOMER",
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export function formatStatusLabel(status: string) {
  switch (status) {
    case "SCHEDULED":
      return "Đã lên lịch";
    case "RUNNING":
      return "Đang chạy";
    case "COMPLETED":
      return "Hoàn thành";
    case "CANCELLED":
      return "Đã hủy";
    case "DELAYED":
      return "Trễ giờ";
    case "AVAILABLE":
      return "Sẵn sàng";
    case "MAINTENANCE":
      return "Bảo trì";
    case "BOOKED":
      return "Đã giữ chỗ";
    case "PAID":
      return "Đã thanh toán";
    default:
      return status;
  }
}
