import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { getMyTickets, cancelTicket, mockPayment, TicketRecord } from "../../api/customer";

// ─── Status & payment config ──────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; style: string; dot: string }> = {
  BOOKED:    { label: "Đã giữ chỗ",    style: "bg-amber-50 text-amber-700 border border-amber-200",  dot: "bg-amber-400" },
  HOLD:      { label: "Chờ thanh toán", style: "bg-blue-50 text-blue-700 border border-blue-200",   dot: "bg-blue-400" },
  CONFIRMED: { label: "Đã xác nhận",   style: "bg-purple-50 text-purple-700 border border-purple-200", dot: "bg-purple-400" },
  PAID:      { label: "Đã thanh toán",  style: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-400" },
  CANCELLED: { label: "Đã hủy",         style: "bg-red-50 text-red-600 border border-red-200",     dot: "bg-red-400" },
  REFUNDED:  { label: "Đã hoàn tiền",   style: "bg-slate-50 text-slate-500 border border-slate-200", dot: "bg-slate-400" },
  EXPIRED:   { label: "Hết hạn",        style: "bg-slate-50 text-slate-400 border border-slate-200", dot: "bg-slate-400" },
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Tiền mặt",
  CARD: "Thẻ ngân hàng",
  MOMO: "MoMo",
  BANK: "Chuyển khoản",
};

// ─── Helpers ────────────────────────────────────────────────────────
const fmtDateTime = (dt: string | null | undefined) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const fmtDate = (dt: string | null | undefined) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

const fmtTime = (dt: string | null | undefined) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("vi-VN", {
    hour: "2-digit", minute: "2-digit",
  });
};

const fmtPrice = (p: number) =>
  p.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

// ─── QR Code component (SVG-based, no library needed) ──────────────
function QRCodeSVG({ value, size = 120 }: { value: string; size?: number }) {
  // Simple visual placeholder — real QR would need a library
  // We generate a deterministic pattern from the string
  const hash = value.split("").reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0);
  const cells: boolean[][] = [];
  const grid = 21;
  for (let r = 0; r < grid; r++) {
    cells[r] = [];
    for (let c = 0; c < grid; c++) {
      // Corner finder patterns (3x3 squares at corners)
      const isCorner =
        (r < 7 && c < 7) ||
        (r < 7 && c > grid - 8) ||
        (r > grid - 8 && c < 7);
      if (isCorner) {
        const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        cells[r][c] = inner ? false : (r % 2 === 0 || c % 2 === 0);
      } else {
        const idx = r * grid + c;
        cells[r][c] = Math.abs(((hash + idx * 7) % 31)) < 15;
      }
    }
  }

  const cellSize = size / grid;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {cells.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="currentColor"
            />
          ) : null
        )
      )}
    </svg>
  );
}

// ─── Invoice Modal ───────────────────────────────────────────────────
interface InvoiceModalProps {
  ticket: TicketRecord;
  onClose: () => void;
  onCancel: (id: number) => Promise<void>;
  onPay: (ticket: TicketRecord) => Promise<void>;
  cancellingId: number | null;
  payingId: number | null;
}

function InvoiceModal({ ticket, onClose, onCancel, onPay, cancellingId, payingId }: InvoiceModalProps) {
  const s = STATUS_MAP[ticket.status] ?? { label: ticket.status, style: "bg-slate-50", dot: "bg-slate-400" };
  const isPaid = ticket.status === "PAID";
  const canPay = ticket.status === "HOLD";
  const canCancel = ticket.status === "HOLD" || ticket.status === "BOOKED";

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        id="invoice-print-area">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-t-2xl px-6 py-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs opacity-75 mb-0.5">VÉ XE KHÁCH HÀNG</div>
              <div className="text-xl font-bold tracking-wide">{ticket.ticketCode}</div>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold bg-white/20 border border-white/30 ${s.label === "Đã thanh toán" ? "text-white" : "text-white"}`}>
              {s.label}
            </span>
          </div>
        </div>

        {/* ── Invoice body ───────────────────────────────────── */}
        <div className="px-6 py-5 space-y-5">

          {/* Route */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">Tuyến đường</div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-lg font-bold text-pink-700">{ticket.origin || "—"}</div>
                <div className="text-xs text-slate-400">Điểm đi</div>
              </div>
              <div className="flex-1 flex items-center gap-2">
                <div className="h-px flex-1 bg-pink-200" />
                <div className="text-pink-400">→</div>
                <div className="h-px flex-1 bg-pink-200" />
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-pink-700">{ticket.destination || "—"}</div>
                <div className="text-xs text-slate-400">Điểm đến</div>
              </div>
            </div>
          </div>

          {/* Trip info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs text-slate-400 uppercase mb-1">Giờ khởi hành</div>
              <div className="text-sm font-semibold text-slate-800">{fmtTime(ticket.departureTime)}</div>
              <div className="text-xs text-slate-500">{fmtDate(ticket.departureTime)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs text-slate-400 uppercase mb-1">Giờ đến (dự kiến)</div>
              <div className="text-sm font-semibold text-slate-800">{fmtTime(ticket.arrivalTime)}</div>
              <div className="text-xs text-slate-500">{fmtDate(ticket.arrivalTime)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs text-slate-400 uppercase mb-1">Biển số xe</div>
              <div className="text-sm font-semibold text-slate-800">{ticket.busLicensePlate || "—"}</div>
              <div className="text-xs text-slate-500">{ticket.busType || ""}</div>
            </div>
            <div className="bg-pink-50 rounded-xl p-3 border border-pink-100">
              <div className="text-xs text-pink-400 uppercase mb-1">Số ghế</div>
              <div className="text-2xl font-bold text-pink-700">{ticket.seatNumber || "—"}</div>
            </div>
          </div>

          {/* Passenger */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Thông tin hành khách</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-400">Họ tên: </span>
                <span className="font-medium text-slate-800">{ticket.passengerName || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400">SĐT: </span>
                <span className="font-medium text-slate-800">{ticket.passengerPhone || "—"}</span>
              </div>
              {ticket.passengerEmail && (
                <div className="col-span-2">
                  <span className="text-slate-400">Email: </span>
                  <span className="font-medium text-slate-800">{ticket.passengerEmail}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment / Invoice */}
          <div className="border-t border-dashed border-slate-200 pt-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">Hóa đơn</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày đặt</span>
                <span className="font-medium">{fmtDateTime(ticket.bookedAt)}</span>
              </div>
              {ticket.paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Phương thức</span>
                  <span className="font-medium">{PAYMENT_METHOD_LABEL[ticket.paymentMethod] ?? ticket.paymentMethod}</span>
                </div>
              )}
              {ticket.transactionCode && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã giao dịch</span>
                  <span className="font-mono text-xs text-slate-700">{ticket.transactionCode}</span>
                </div>
              )}
              {ticket.transactionTime && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Thời gian thanh toán</span>
                  <span className="font-medium">{fmtDateTime(ticket.transactionTime)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className="text-base font-semibold text-slate-700">Tổng cộng</span>
                <span className="text-xl font-bold text-pink-600">{fmtPrice(ticket.price)}</span>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Mã vé / QR Check-in</div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-pink-600" style={{ color: "#be185d" }}>
                <QRCodeSVG value={ticket.ticketCode} size={110} />
              </div>
            </div>
            <div className="font-mono text-sm font-semibold text-pink-700 tracking-widest">{ticket.ticketCode}</div>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────────── */}
        <div className="px-6 pb-6 flex gap-3 flex-wrap">
          <button onClick={handlePrint}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            🖨️ In vé
          </button>
          {canCancel && (
            <button onClick={() => onCancel(ticket.id)}
              disabled={cancellingId === ticket.id}
              className="flex-1 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
              {cancellingId === ticket.id ? "Đang hủy..." : "❌ Hủy vé"}
            </button>
          )}
          {canPay && (
            <button onClick={() => onPay(ticket)}
              disabled={payingId === ticket.id}
              className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors">
              {payingId === ticket.id ? "Đang thanh toán..." : "💳 Thanh toán ngay"}
            </button>
          )}
          <button onClick={onClose}
            className="flex-1 rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pink-600 transition-colors">
            Đóng
          </button>
        </div>
      </div>

      {/* Print-only: hide modal overlay */}
      <style>{`@media print { body > *:not(#invoice-print-area) { display:none !important; } #invoice-print-area { position:fixed; top:0; left:0; width:100%; max-width:100%; max-height:100%; overflow:visible; border-radius:0; box-shadow:none; } }`}</style>
    </div>
  );
}

// ─── Ticket Card ────────────────────────────────────────────────────
interface TicketCardProps {
  ticket: TicketRecord;
  onViewDetail: (t: TicketRecord) => void;
}

function TicketCard({ ticket, onViewDetail }: TicketCardProps) {
  const s = STATUS_MAP[ticket.status] ?? { label: ticket.status, style: "bg-slate-50", dot: "bg-slate-400" };

  const isPaid = ticket.status === "PAID";
  const isCancelled = ticket.status === "CANCELLED";

  return (
    <div
      onClick={() => onViewDetail(ticket)}
      className={`rounded-2xl border bg-white transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-md
        ${isCancelled ? "border-red-100 opacity-70" : isPaid ? "border-emerald-200" : "border-slate-100"}`}
    >
      {/* Top stripe */}
      <div className={`h-1.5 rounded-t-2xl ${isCancelled ? "bg-red-400" : isPaid ? "bg-emerald-400" : "bg-pink-400"}`} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="font-mono text-xs font-semibold text-pink-500 tracking-wider">
            {ticket.ticketCode}
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.style}`}>
            {s.label}
          </span>
        </div>

        {/* Route */}
        <div className="flex items-center gap-2 mb-3">
          <div className="text-sm font-semibold text-slate-800 truncate">{ticket.origin}</div>
          <div className="text-slate-300 shrink-0">→</div>
          <div className="text-sm font-semibold text-slate-800 truncate">{ticket.destination}</div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center bg-slate-50 rounded-xl py-2">
            <div className="text-xs text-slate-400 mb-0.5">Giờ đi</div>
            <div className="text-sm font-semibold text-slate-700">{fmtTime(ticket.departureTime)}</div>
            <div className="text-xs text-slate-400">{fmtDate(ticket.departureTime)}</div>
          </div>
          <div className="text-center bg-pink-50 rounded-xl py-2 border border-pink-100">
            <div className="text-xs text-pink-400 mb-0.5">Ghế</div>
            <div className="text-lg font-bold text-pink-700">{ticket.seatNumber || "—"}</div>
          </div>
          <div className="text-center bg-slate-50 rounded-xl py-2">
            <div className="text-xs text-slate-400 mb-0.5">Thanh toán</div>
            <div className={`text-sm font-semibold ${isPaid ? "text-emerald-600" : isCancelled ? "text-red-400" : "text-amber-600"}`}>
              {isPaid ? "✓ Đã TT" : isCancelled ? "— Đã hủy" : "⏳ Chưa TT"}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-400 truncate mr-2">{ticket.busLabel || ticket.busLicensePlate}</div>
          <div className="text-right shrink-0">
            <div className="font-bold text-pink-600">{fmtPrice(ticket.price)}</div>
            {isPaid && ticket.transactionCode && (
              <div className="text-xs text-emerald-500">#{ticket.transactionCode.split("-")[1] ?? ticket.transactionCode}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function CustomerTicketsPage() {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);

  const load = useCallback(() => {
    getMyTickets()
      .then(setTickets)
      .catch(() => toast.error("Không tải được danh sách vé"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id: number) => {
    if (!window.confirm("Bạn chắc chắn muốn hủy vé này?")) return;
    setCancellingId(id);
    try {
      const updated = await cancelTicket(id);
      setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
      if (selectedTicket?.id === id) setSelectedTicket({ ...selectedTicket, status: updated.status });
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
      await mockPayment({ ticketId: ticket.id, paymentMethod: "CASH" });
      const updated = await getMyTickets();
      setTickets(updated);
      const refreshed = updated.find(t => t.id === ticket.id);
      if (refreshed && selectedTicket?.id === ticket.id) setSelectedTicket(refreshed);
      toast.success("Thanh toán thành công!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Thanh toán thất bại");
    } finally {
      setPayingId(null);
    }
  };

  if (loading)
    return (
      <div className="rounded-2xl bg-white p-10 text-center text-sm text-pink-400 shadow-sm">
        Đang tải...
      </div>
    );

  if (tickets.length === 0)
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <p className="text-pink-500 mb-3">Bạn chưa có vé nào.</p>
        <Link to="/customer/booking"
          className="customer-btn-primary text-sm font-semibold text-white hover:underline">
          Đặt vé ngay →
        </Link>
      </div>
    );

  return (
    <>
      {/* Print layout */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden print:shadow-none">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-base font-semibold text-pink-900">Vé của tôi</h1>
            <p className="text-sm text-pink-400">{tickets.length} vé</p>
          </div>
        </div>

        {/* Ticket grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4 print:grid-cols-2">
          {tickets.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} onViewDetail={setSelectedTicket} />
          ))}
        </div>
      </div>

      {/* Invoice Modal */}
      {selectedTicket && (
        <InvoiceModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onCancel={handleCancel}
          onPay={handlePayNow}
          cancellingId={cancellingId}
          payingId={payingId}
        />
      )}
    </>
  );
}
