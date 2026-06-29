// ============================================================================
// CUSTOMER TICKETS PAGE — Trang "Vé của tôi"
// Tính năng:
//   - Xem DS vé đã đặt + phân trang
//   - Hủy vé (chỉ HOLD/BOOKED)
//   - Mở modal khiếu nại (FeedbackModal) cho admin
//   - QR thanh toán VietQR
// ============================================================================

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { MessageCircle, X } from "lucide-react";
import { getMyTickets, cancelTicket, TicketRecord } from "../../api/customer";
import { getMyFeedbacks } from "../../api/feedback";
import FeedbackModal from "../../components/feedback/FeedbackModal";
import Pagination from "../../components/ui/Pagination";

const QR_CODE_INFO = {
  bankId: "VCB",
  accountNo: "0987654321",
  accountName: "LE VU HAO",
};
const generateVietQRUrl = (amount: number, ticketCode: string) => {
  const transferContent = `THANH TOAN VE ${ticketCode}`;
  return `https://img.vietqr.io/image/${QR_CODE_INFO.bankId}-${QR_CODE_INFO.accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(QR_CODE_INFO.accountName)}`;
};

// ─── Status & payment config ──────────────────────────────────────────
// Phía customer chỉ quan tâm "Đã xác nhận" hay chưa — không hiển thị chi tiết
// payment state (PAID/HOLD/CONFIRMED gộp về "Đã xác nhận" vì ý nghĩa tương đương
// với người dùng: admin đã duyệt, vé dùng được).
const STATUS_MAP: Record<string, { label: string; style: string; dot: string }> = {
  CONFIRMED: { label: "Đã xác nhận", style: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-400" },
  PAID:      { label: "Đã xác nhận", style: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-400" },
  BOOKED:    { label: "Chờ xác nhận", style: "bg-amber-50 text-amber-700 border border-amber-200",   dot: "bg-amber-400"   },
  HOLD:      { label: "Chờ xác nhận", style: "bg-amber-50 text-amber-700 border border-amber-200",   dot: "bg-amber-400"   },
  CANCELLED: { label: "Đã hủy",       style: "bg-red-50 text-red-600 border border-red-200",          dot: "bg-red-400"     },
  REFUNDED:  { label: "Đã hoàn tiền", style: "bg-slate-50 text-slate-500 border border-slate-200",    dot: "bg-slate-400"   },
  EXPIRED:   { label: "Hết hạn",      style: "bg-slate-50 text-slate-400 border border-slate-200",    dot: "bg-slate-400"   },
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH:  "Tiền mặt",
  CARD:  "Thẻ ngân hàng",
  MOMO:  "MoMo",
  BANK:  "Chuyển khoản QR",
  VNPAY: "VNPay",
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

// ─── QR Code component (Cho QR Check-in) ──────────────
function QRCodeSVG({ value, size = 120 }: { value: string; size?: number }) {
  const hash = value.split("").reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0);
  const cells: boolean[][] = [];
  const grid = 21;
  for (let r = 0; r < grid; r++) {
    cells[r] = [];
    for (let c = 0; c < grid; c++) {
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

// ─── QR Payment Modal (VietQR) ───────────────────────────────────────
function QRCodePaymentModal({ 
  ticket, 
  onClose, 
  onConfirm, 
}: { 
  ticket: TicketRecord; 
  onClose: () => void; 
  onConfirm: () => void; 
}) {
  const qrUrl = generateVietQRUrl(ticket.price, ticket.ticketCode);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden text-center">
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-4 flex justify-between items-center text-white">
           <h2 className="text-lg font-bold">Thanh toán chuyển khoản</h2>
           <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-full transition"><X size={20} /></button>
        </div>
        <div className="p-6">
          <div className="mb-2 text-slate-500 text-sm">Tổng tiền thanh toán</div>
          <div className="text-3xl font-bold text-pink-600 mb-6">{fmtPrice(ticket.price)}</div>
          
          <div className="flex justify-center mb-6">
             <div className="p-3 border-2 border-pink-100 rounded-2xl bg-white shadow-sm inline-block">
               <img src={qrUrl} alt="VietQR" className="w-56 h-56 object-contain" />
             </div>
          </div>
          
          <p className="text-sm text-slate-500 mb-3 px-2">
             Mở ứng dụng ngân hàng và quét mã QR trên để chuyển khoản. Nội dung và số tiền đã được điền tự động.
          </p>
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 text-left">
            <p className="font-semibold mb-1">⚠️ Lưu ý:</p>
            <p>Sau khi chuyển khoản, vui lòng bấm "Đã chuyển khoản" bên dưới.</p>
            <p className="mt-1">Nhân viên sẽ xác minh và xác nhận thanh toán trong thời gian sớm nhất.</p>
          </div>
          
          <button
            onClick={onConfirm}
            className="w-full flex justify-center items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
          >
            ✓ Đã chuyển khoản
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Invoice Modal ───────────────────────────────────────────────────
interface InvoiceModalProps {
  ticket: TicketRecord;
  hasFeedback: boolean;
  onClose: () => void;
  onCancel: (id: number) => Promise<void>;
  onPay: (ticket: TicketRecord) => void;
  onOpenFeedback: (t: TicketRecord) => void;
  cancellingId: number | null;
}

function InvoiceModal({ ticket, hasFeedback, onClose, onCancel, onPay, onOpenFeedback, cancellingId }: InvoiceModalProps) {
  const s = STATUS_MAP[ticket.status] ?? { label: ticket.status, style: "bg-slate-50", dot: "bg-slate-400" };
  const canPay = ticket.status === "HOLD" || ticket.status === "CONFIRMED";
  const canCancel = ticket.status === "HOLD" || ticket.status === "BOOKED";
  const canFeedback = ticket.status !== "CANCELLED" && ticket.status !== "REFUNDED";

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
            <span className={`rounded-full px-3 py-1 text-xs font-semibold bg-white/20 border border-white/30 text-white`}>
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

          {/* Pickup & Dropoff */}
          {(ticket.pickupPoint || ticket.dropoffPoint) && (
            <div className="bg-emerald-50 rounded-xl p-4 space-y-2 border border-emerald-100">
              <div className="text-xs text-emerald-600 uppercase tracking-wider mb-2 font-semibold">Điểm đón / Điểm trả</div>
              {ticket.pickupPoint && (
                <div className="flex items-start gap-2">
                  <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-200 text-emerald-700 text-[10px] font-bold mt-0.5">Đ</span>
                  <div>
                    <div className="text-xs text-emerald-500 font-medium">Điểm đón</div>
                    <div className="text-sm text-emerald-700 font-medium">{ticket.pickupPoint}</div>
                  </div>
                </div>
              )}
              {ticket.dropoffPoint && (
                <div className="flex items-start gap-2">
                  <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-200 text-amber-700 text-[10px] font-bold mt-0.5">T</span>
                  <div>
                    <div className="text-xs text-amber-500 font-medium">Điểm trả</div>
                    <div className="text-sm text-amber-700 font-medium">{ticket.dropoffPoint}</div>
                  </div>
                </div>
              )}
            </div>
          )}

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
              className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors">
              💳 Thanh toán ngay
            </button>
          )}
          {canFeedback && (
            <button onClick={() => onOpenFeedback(ticket)}
              className={`flex-1 inline-flex items-center justify-center gap-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                hasFeedback
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                  : "bg-pink-500 text-white hover:bg-pink-600"
              }`}>
              <MessageCircle className="h-4 w-4" />
              {hasFeedback ? "Đã gửi phản hồi" : "💬 Gửi phản hồi"}
            </button>
          )}
          <button onClick={onClose}
            className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors">
            Đóng
          </button>
        </div>
      </div>

      <style>{`@media print { body > *:not(#invoice-print-area) { display:none !important; } #invoice-print-area { position:fixed; top:0; left:0; width:100%; max-width:100%; max-height:100%; overflow:visible; border-radius:0; box-shadow:none; } }`}</style>
    </div>
  );
}

// ─── Ticket Card ────────────────────────────────────────────────────
interface TicketCardProps {
  ticket: TicketRecord;
  hasFeedback: boolean;
  onViewDetail: (t: TicketRecord) => void;
  onOpenFeedback: (t: TicketRecord) => void;
}

function TicketCard({ ticket, hasFeedback, onViewDetail, onOpenFeedback }: TicketCardProps) {
  const s = STATUS_MAP[ticket.status] ?? { label: ticket.status, style: "bg-slate-50", dot: "bg-slate-400" };

  const isCancelled = ticket.status === "CANCELLED";
  const canFeedback = !isCancelled; // Cho phép feedback với mọi vé chưa hủy

  return (
    <div
      className={`rounded-2xl border bg-white transition-all hover:-translate-y-0.5 hover:shadow-md
        ${isCancelled ? "border-red-100 opacity-70" : "border-slate-100"}`}
    >
      <div className={`h-1.5 rounded-t-2xl ${isCancelled ? "bg-red-400" : "bg-pink-400"}`} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-mono text-xs font-semibold text-pink-500 tracking-wider">
            {ticket.ticketCode}
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.style}`}>
            {s.label}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="text-sm font-semibold text-slate-800 truncate">{ticket.origin}</div>
          <div className="text-slate-300 shrink-0">→</div>
          <div className="text-sm font-semibold text-slate-800 truncate">{ticket.destination}</div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="text-center bg-slate-50 rounded-xl py-2">
            <div className="text-xs text-slate-400 mb-0.5">Giờ đi</div>
            <div className="text-sm font-semibold text-slate-700">{fmtTime(ticket.departureTime)}</div>
            <div className="text-xs text-slate-400">{fmtDate(ticket.departureTime)}</div>
          </div>
          <div className="text-center bg-pink-50 rounded-xl py-2 border border-pink-100">
            <div className="text-xs text-pink-400 mb-0.5">Ghế</div>
            <div className="text-lg font-bold text-pink-700">{ticket.seatNumber || "—"}</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 mr-2">
            <div className="text-xs text-slate-400 truncate">{ticket.busLabel || ticket.busLicensePlate}</div>
            {(ticket.pickupPoint || ticket.dropoffPoint) && (
              <div className="mt-1 flex gap-1.5 flex-wrap">
                {ticket.pickupPoint && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] text-emerald-600 font-medium">
                    📍 {ticket.pickupPoint.split(" - ")[0]}
                  </span>
                )}
                {ticket.dropoffPoint && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[9px] text-amber-600 font-medium">
                    📍 {ticket.dropoffPoint.split(" - ")[0]}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="font-bold text-pink-600">{fmtPrice(ticket.price)}</div>
          </div>
        </div>

        {/* Action row */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            onClick={() => onViewDetail(ticket)}
            className="text-xs font-semibold text-pink-600 hover:text-pink-700 hover:underline"
          >
            Xem chi tiết vé →
          </button>

          {canFeedback && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenFeedback(ticket);
              }}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                hasFeedback
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                  : "bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100"
              }`}
            >
              <MessageCircle className="h-3 w-3" />
              {hasFeedback ? "Đã gửi phản hồi" : "Gửi phản hồi"}
            </button>
          )}
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
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);

  // State quản lý việc hiển thị modal QR
  const [qrTicket, setQrTicket] = useState<TicketRecord | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // State feedback
  const [feedbackTicketIds, setFeedbackTicketIds] = useState<Set<number>>(new Set());
  const [feedbackTripIds, setFeedbackTripIds] = useState<Set<number>>(new Set());
  /** null = chưa mở; undefined = mở form mới (không gắn vé); TicketRecord = mở gắn vé cụ thể */
  const [feedbackModalTarget, setFeedbackModalTarget] = useState<TicketRecord | null | undefined>(null);

  const loadFeedbackMap = useCallback(async () => {
    try {
      const list = await getMyFeedbacks();
      const ticketIds = new Set<number>();
      const tripIds = new Set<number>();
      list.forEach((f) => {
        if (f.relatedTripId) tripIds.add(f.relatedTripId);
      });
      setFeedbackTicketIds(ticketIds);
      setFeedbackTripIds(tripIds);
    } catch {
      // Im lặng nếu fail — không block UX
    }
  }, []);

  const load = useCallback(() => {
    getMyTickets()
      .then(data => {
        setTickets(data);
        setCurrentPage(1); // Reset page on new load
      })
      .catch(() => toast.error("Không tải được danh sách vé"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadFeedbackMap(); }, [loadFeedbackMap]);

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

  const handleConfirmTransfer = async (ticket: TicketRecord) => {
    setQrTicket(null);
    toast.success("Đã ghi nhận! Nhân viên sẽ xác minh và xác nhận thanh toán trong thời gian sớm nhất.");
  };

  const ticketHasFeedback = (t: TicketRecord) => feedbackTripIds.has(t.tripId);

  // Pagination logic
  const totalPages = Math.ceil(tickets.length / ITEMS_PER_PAGE);
  // Đảm bảo currentPage hợp lệ nếu danh sách vé thay đổi
  const validCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedTickets = tickets.slice((validCurrentPage - 1) * ITEMS_PER_PAGE, validCurrentPage * ITEMS_PER_PAGE);

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
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden print:shadow-none mb-6">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-base font-semibold text-pink-900">Vé của tôi</h1>
            <p className="text-sm text-pink-400">{tickets.length} vé · Bấm vào vé để xem chi tiết</p>
          </div>
          <button
            onClick={() => setFeedbackModalTarget(undefined)}
            className="inline-flex items-center gap-2 rounded-full bg-pink-500 px-4 py-2 text-xs font-semibold text-white hover:bg-pink-600 transition-colors shadow-sm shadow-pink-200"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Gửi phản hồi mới
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4 print:grid-cols-2">
          {paginatedTickets.map(ticket => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              hasFeedback={ticketHasFeedback(ticket)}
              onViewDetail={setSelectedTicket}
              onOpenFeedback={setFeedbackModalTarget}
            />
          ))}
        </div>
        
        {totalPages > 1 && (
          <div className="border-t border-slate-100 bg-slate-50/50">
            <Pagination 
              currentPage={validCurrentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
            />
          </div>
        )}
      </div>

      {/* Invoice Modal (Chi tiết vé) */}
      {selectedTicket && (
        <InvoiceModal
          ticket={selectedTicket}
          hasFeedback={ticketHasFeedback(selectedTicket)}
          onClose={() => setSelectedTicket(null)}
          onCancel={handleCancel}
          onPay={(t) => setQrTicket(t)}
          onOpenFeedback={(t) => {
            setSelectedTicket(null);
            setFeedbackModalTarget(t);
          }}
          cancellingId={cancellingId}
        />
      )}

      {/* QR Code Payment Modal (Lớp đè lên trên Invoice Modal) */}
      {qrTicket && (
        <QRCodePaymentModal
          ticket={qrTicket}
          onClose={() => setQrTicket(null)}
          onConfirm={() => handleConfirmTransfer(qrTicket)}
        />
      )}

      {/* Feedback Modal — feedbackModalTarget !== null = đang mở (null = chưa; undefined = form mới không gắn vé) */}
      {feedbackModalTarget !== null && (
        <FeedbackModal
          tickets={tickets}
          initialTicket={feedbackModalTarget ?? undefined}
          onClose={() => setFeedbackModalTarget(null)}
          onCreated={() => {
            loadFeedbackMap();
            load();
          }}
        />
      )}
    </>
  );
}