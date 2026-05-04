import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { getMyTickets, cancelTicket, mockPayment, TicketRecord } from "../../api/customer";

const STATUS_MAP: Record<string, { label: string; style: string }> = {
  BOOKED: { label: "Chờ xác nhận", style: "bg-amber-100 text-amber-800" },
  HOLD: { label: "Chờ thanh toán", style: "bg-blue-100 text-blue-800" },
  PAID: { label: "Đã thanh toán", style: "bg-emerald-100 text-emerald-800" },
  CANCELLED: { label: "Đã hủy", style: "bg-red-100 text-red-700" },
  REFUNDED: { label: "Hoàn tiền", style: "bg-slate-100 text-slate-600" },
};

const fmtDateTime = (dt: string) =>
  new Date(dt).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtPrice = (p: number) =>
  p.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

export default function CustomerTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);

  useEffect(() => {
    getMyTickets()
      .then(setTickets)
      .catch(() => toast.error("Không tải được danh sách vé"))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id: number) => {
    if (!window.confirm("Bạn chắc chắn muốn hủy vé này?")) return;
    setCancellingId(id);
    try {
      const updated = await cancelTicket(id);
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: updated.status } : t)),
      );
      toast.success("Hủy vé thành công");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Hủy vé thất bại");
    } finally {
      setCancellingId(null);
    }
  };

  const handlePayNow = async (ticket: TicketRecord) => {
    setPayingId(ticket.id);
    try {
      await mockPayment(ticket.id, ticket.price);
      // Reload tickets to get updated status
      const updated = await getMyTickets();
      setTickets(updated);
      toast.success("Thanh toán thành công!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Thanh toán thất bại");
    } finally {
      setPayingId(null);
    }
  };

  if (loading)
    return (
      <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
        Đang tải...
      </div>
    );

  if (tickets.length === 0)
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <p className="text-slate-500 mb-3">Bạn chưa có vé nào.</p>
        <Link
          to="/customer/booking"
          className="text-sm font-semibold text-[#0F2849] hover:underline"
        >
          Đặt vé ngay →
        </Link>
      </div>
    );

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4">
        <h1 className="text-base font-semibold text-slate-900">Vé của tôi</h1>
        <p className="text-sm text-slate-400">{tickets.length} vé</p>
      </div>
      <div className="divide-y divide-slate-100">
        {tickets.map((ticket) => {
          const s = STATUS_MAP[ticket.status] ?? {
            label: ticket.status,
            style: "bg-slate-100 text-slate-600",
          };
          const canCancel = ticket.status === "BOOKED";
          const canPay = ticket.status === "HOLD";
          return (
            <div
              key={ticket.id}
              className="flex items-center justify-between px-6 py-4 gap-4"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="font-medium text-slate-900 truncate">
                  {ticket.routeName}
                </div>
                <div className="text-sm text-slate-500">
                  {fmtDateTime(ticket.departureTime)} · Ghế{" "}
                  <strong>{ticket.seatNumber}</strong>
                </div>
                <div className="text-xs text-slate-400">
                  {ticket.busLabel} · Mã #{ticket.id}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="font-semibold text-slate-900 text-sm">
                    {fmtPrice(ticket.price)}
                  </div>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.style}`}
                  >
                    {s.label}
                  </span>
                </div>
                {canCancel && (
                  <button
                    onClick={() => handleCancel(ticket.id)}
                    disabled={cancellingId === ticket.id}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {cancellingId === ticket.id ? "..." : "Hủy"}
                  </button>
                )}
                {canPay && (
                  <button
                    onClick={() => handlePayNow(ticket)}
                    disabled={payingId === ticket.id}
                    className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {payingId === ticket.id ? "..." : "Thanh toán"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
