import { useEffect, useState } from "react";
import {
  X, MapPin, Phone, User, Check, XCircle, CreditCard, Wallet,
  Calendar, Hash, Bus, RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getAdminTripById,
  confirmTicket,
  cancelTicketByAdmin,
  AdminTripDetail,
  AdminTripSeat,
  getAdminTicketById,
} from "../../api/admin";
import type { AdminTicketDetail } from "../../api/admin";
import { extractApiErrorMessage } from "../../utils/apiError";

interface Props {
  tripId: number;
  tripLabel: string;       // vd: "Hà Nội → TP.HCM · 28/06/2026 08:00"
  onClose: () => void;
  onChanged?: () => void; // reload trips list nếu có
}

const fmtPrice = (n: number) => n.toLocaleString("vi-VN") + " đ";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  BOOKED:    { label: "Đã đặt",         color: "text-blue-700",     bg: "bg-blue-100"     },
  HOLD:      { label: "Chờ xác nhận",   color: "text-amber-700",    bg: "bg-amber-100"    },
  CONFIRMED: { label: "Đã xác nhận",    color: "text-emerald-700",  bg: "bg-emerald-100"  },
  PAID:      { label: "Đã thanh toán",  color: "text-emerald-700",  bg: "bg-emerald-100"  },
  CANCELLED: { label: "Đã hủy",         color: "text-rose-700",     bg: "bg-rose-100"     },
  REFUNDED:  { label: "Đã hoàn tiền",   color: "text-slate-700",    bg: "bg-slate-100"    },
  EXPIRED:   { label: "Hết hạn",        color: "text-slate-500",    bg: "bg-slate-100"    },
};

const PAYMENT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  CASH:   { label: "Tiền mặt (COD)",  color: "text-emerald-700", bg: "bg-emerald-100" },
  VNPAY:  { label: "VNPay",           color: "text-blue-700",    bg: "bg-blue-100"    },
  CARD:   { label: "Thẻ ngân hàng",   color: "text-purple-700",  bg: "bg-purple-100"  },
  MOMO:   { label: "MoMo",            color: "text-pink-700",    bg: "bg-pink-100"    },
  BANK:   { label: "Chuyển khoản",    color: "text-amber-700",   bg: "bg-amber-100"   },
};

// Các phương thức online — dùng để sắp xếp vé online lên đầu + highlight riêng
const ONLINE_PAYMENT_METHODS = new Set(["VNPAY", "CARD", "MOMO", "BANK"]);

const isOnlinePayment = (m?: string | null) => !!m && ONLINE_PAYMENT_METHODS.has(m);

export default function TripSeatsModal({ tripId, tripLabel, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<AdminTripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState<AdminTripSeat | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<
    { detail: AdminTicketDetail; pickup: string | null; dropoff: string | null } | null
  >(null);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [acting, setActing] = useState(false);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const data = await getAdminTripById(tripId);
      setDetail(data);
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không tải được sơ đồ ghế");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [tripId]);

  // Khi click vào 1 ghế → tìm ticket tương ứng trong detail.tickets
  const handleSeatClick = async (seat: AdminTripSeat) => {
    if (!seat.booked) {
      toast("Ghế trống — chưa có ai đặt", { icon: "🪑" });
      return;
    }
    const ticket = detail?.tickets.find((t) => t.seatNumber === seat.seatNumber);
    setSelectedSeat(seat);
    setSelectedTicket(null);
    setLoadingTicket(true);
    try {
      if (ticket) {
        const full = await getAdminTicketById(ticket.id);
        setSelectedTicket({ detail: full, pickup: ticket.pickupPoint, dropoff: ticket.dropoffPoint });
      } else {
        toast.error("Không tìm thấy thông tin vé cho ghế này");
      }
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không tải được chi tiết vé");
    } finally {
      setLoadingTicket(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedTicket) return;
    setActing(true);
    try {
      await confirmTicket(selectedTicket.detail.id);
      toast.success("Đã xác nhận vé thành công");
      setSelectedTicket(null);
      setSelectedSeat(null);
      await loadDetail();
      onChanged?.();
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không thể xác nhận vé");
    } finally {
      setActing(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedTicket) return;
    if (!window.confirm("Bạn chắc chắn muốn hủy vé này?")) return;
    setActing(true);
    try {
      await cancelTicketByAdmin(selectedTicket.detail.id);
      toast.success("Đã hủy vé");
      setSelectedTicket(null);
      setSelectedSeat(null);
      await loadDetail();
      onChanged?.();
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không thể hủy vé");
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-6xl max-h-[95vh] overflow-hidden bg-gradient-to-br from-sky-50 via-white to-indigo-50 rounded-3xl shadow-2xl border border-indigo-100 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 p-5 flex items-center justify-between shadow-md">
          <div>
            <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">Sơ đồ ghế</p>
            <h2 className="text-xl font-bold text-white">{tripLabel}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadDetail}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors"
              title="Tải lại"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Cột trái: Sơ đồ ghế */}
          <div className="lg:col-span-2 space-y-3">
            {loading ? (
              <div className="p-12 text-center text-slate-500">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
                Đang tải sơ đồ ghế...
              </div>
            ) : !detail ? (
              <div className="p-12 text-center text-rose-500">Không tải được dữ liệu</div>
            ) : detail.totalSeats === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Bus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Chuyến này chưa được gán xe, không có sơ đồ ghế</p>
              </div>
            ) : (
              <SeatGrid
                seats={detail.seats}
                totalSeats={detail.totalSeats}
                selectedSeatNumber={selectedSeat?.seatNumber ?? null}
                onSeatClick={handleSeatClick}
              />
            )}
          </div>

            {/* Cột phải: Chi tiết ghế đang chọn */}
          <div className="space-y-3">
            {selectedSeat && selectedTicket ? (
              <SeatInfoPanel
                seat={selectedSeat}
                ticket={selectedTicket}
                loading={loadingTicket}
                acting={acting}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
              />
            ) : (
              <div className="p-6 rounded-2xl bg-white border border-indigo-100 text-center text-slate-500 shadow-sm">
                <MapPin className="w-10 h-10 mx-auto mb-3 opacity-50 text-indigo-400" />
                <p className="text-sm">Click vào 1 ghế để xem chi tiết</p>
                <p className="text-xs mt-2 text-slate-400">
                  Ghế xanh = trống · Ghế đỏ = đã đặt
                </p>
              </div>
            )}

            {/* Danh sách tóm tắt */}
            {detail && detail.tickets.length > 0 && (
              <div className="rounded-2xl bg-white border border-indigo-100 p-3 shadow-sm">
                <h4 className="text-xs font-semibold text-indigo-700 mb-2 uppercase">
                  Tóm tắt vé đã đặt ({detail.bookedSeats}/{detail.totalSeats})
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {[...detail.tickets]
                    .sort((a, b) => {
                      // Online (VNPay/CARD/MOMO/BANK) lên đầu, COD/unpaid xuống dưới
                      const aOnline = isOnlinePayment(a.paymentMethod) ? 0 : 1;
                      const bOnline = isOnlinePayment(b.paymentMethod) ? 0 : 1;
                      if (aOnline !== bOnline) return aOnline - bOnline;
                      return 0;
                    })
                    .map((t) => {
                      const online = isOnlinePayment(t.paymentMethod);
                      const methodInfo = t.paymentMethod
                        ? PAYMENT_LABELS[t.paymentMethod]
                        : null;
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            const seat = detail.seats.find((s) => s.seatNumber === t.seatNumber);
                            if (seat) handleSeatClick(seat);
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                            online
                              ? "bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-300 ring-1 ring-blue-200"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <span className={`w-7 h-7 rounded-md flex items-center justify-center font-bold shrink-0 ${
                            online
                              ? "bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-sm"
                              : "bg-slate-200 text-slate-700"
                          }`}>
                            {t.seatNumber}
                          </span>
                          <span className="flex-1 truncate text-slate-800">{t.passengerName || "—"}</span>
                          {online && methodInfo && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${methodInfo.bg} ${methodInfo.color} ring-1 ring-current/20`}>
                              {methodInfo.label}
                            </span>
                          )}
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_LABELS[t.status]?.bg ?? "bg-slate-200"} ${STATUS_LABELS[t.status]?.color ?? "text-slate-700"}`}>
                            {STATUS_LABELS[t.status]?.label ?? t.status}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
// Sơ đồ ghế: lưới 10 cột, mỗi ghế là 1 nút
// ───────────────────────────────────────────────────────────────────
function SeatGrid({
  seats, totalSeats, selectedSeatNumber, onSeatClick,
}: {
  seats: AdminTripSeat[];
  totalSeats: number;
  selectedSeatNumber: string | null;
  onSeatClick: (seat: AdminTripSeat) => void;
}) {
  // Sắp xếp theo positionY (hàng) rồi positionX (cột)
  const sorted = [...seats].sort((a, b) => {
    if (a.positionY !== b.positionY) return (a.positionY ?? 0) - (b.positionY ?? 0);
    return (a.positionX ?? 0) - (b.positionX ?? 0);
  });

  return (
    <div className="rounded-2xl bg-white border border-indigo-100 p-4 shadow-sm">
      {/* Mũi xe */}
      <div className="flex justify-center mb-4">
        <div className="px-6 py-1.5 rounded-t-3xl bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200 text-[10px] font-bold text-indigo-700 uppercase tracking-widest">
          Mũi xe
        </div>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
        {sorted.map((seat) => {
          const isSelected = seat.seatNumber === selectedSeatNumber;
          let cls = "";
          if (seat.booked) {
            cls = isSelected
              ? "bg-gradient-to-br from-rose-500 to-red-500 text-white ring-2 ring-amber-300 shadow-md"
              : "bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-200";
          } else {
            cls = isSelected
              ? "bg-gradient-to-br from-emerald-500 to-green-500 text-white ring-2 ring-amber-300 shadow-md"
              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200";
          }
          return (
            <button
              key={seat.id}
              onClick={() => onSeatClick(seat)}
              title={`Ghế ${seat.seatNumber}${seat.booked ? " · " + (seat.passengerName || "Đã đặt") : " · Trống"}`}
              className={`aspect-square rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center ${cls}`}
            >
              {seat.seatNumber}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-emerald-50 border border-emerald-300" /> Trống</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-rose-100 border border-rose-300" /> Đã đặt</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-gradient-to-br from-emerald-500 to-green-500 ring-2 ring-amber-300" /> Đang chọn</span>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
// Panel bên phải: chi tiết ghế + nút hành động
// ───────────────────────────────────────────────────────────────────
function SeatInfoPanel({
  seat, ticket, loading, acting, onConfirm, onCancel,
}: {
  seat: AdminTripSeat;
  ticket: { detail: AdminTicketDetail; pickup: string | null; dropoff: string | null };
  loading: boolean;
  acting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-indigo-100 p-6 text-center text-slate-500 shadow-sm">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto" />
        <p className="text-xs mt-3">Đang tải chi tiết vé...</p>
      </div>
    );
  }

  const t = ticket.detail;
  const status = STATUS_LABELS[t.status] ?? { label: t.status, color: "text-slate-700", bg: "bg-slate-100" };
  const isConfirmable = t.status === "HOLD";
  const isCancellable = t.status === "HOLD" || t.status === "CONFIRMED" || t.status === "BOOKED";

  return (
    <div className="rounded-2xl bg-white border border-indigo-100 p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-800">Ghế {seat.seatNumber}</h4>
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${status.bg} ${status.color}`}>
          {status.label}
        </span>
      </div>

      {/* Thông tin hành khách */}
      <div className="space-y-2 text-xs">
        {t.passenger ? (
          <>
            <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Hành khách" value={t.passenger.fullName} />
            <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="SĐT" value={t.passenger.phone || "—"} />
            {t.passenger.email && (
              <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="Email" value={t.passenger.email} />
            )}
          </>
        ) : (
          <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Hành khách" value="(không có)" />
        )}
      </div>

      {/* Điểm đón / trả */}
      <div className="space-y-2 text-xs pt-2 border-t border-slate-200">
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Điểm đón</div>
            <div className="text-emerald-700 font-medium break-words">
              {ticket.pickup || "—"}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Điểm trả</div>
            <div className="text-amber-700 font-medium break-words">
              {ticket.dropoff || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Thanh toán */}
      <div className={`space-y-2 text-xs pt-2 border-t rounded-lg p-2 ${
        t.payment?.paymentMethod === "VNPAY"
          ? "border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 ring-1 ring-blue-200"
          : "border-slate-200"
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center gap-1">
            {t.payment?.paymentMethod === "VNPAY"
              ? <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              : <Wallet className="w-3.5 h-3.5 text-slate-500" />}
            Phương thức
          </span>
          <span className={`font-semibold flex items-center gap-1 ${
            t.payment?.paymentMethod === "VNPAY"
              ? "text-blue-700"
              : "text-slate-800"
          }`}>
            {t.payment?.paymentMethod
              ? (
                <>
                  {PAYMENT_LABELS[t.payment.paymentMethod]?.label ?? t.payment.paymentMethod}
                  {t.payment.paymentMethod === "VNPAY" && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm ml-1">
                      Online
                    </span>
                  )}
                </>
              )
              : <span className="text-slate-400 italic">Chưa thanh toán</span>}
          </span>
        </div>
{t.payment && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Trạng thái TT</span>
                  <span className={`font-semibold ${
                    t.payment.status === "SUCCESS" ? "text-emerald-600" :
                    t.payment.status === "FAILED"  ? "text-rose-600"     :
                                                    "text-amber-600"
                  }`}>
                    {t.payment.status}
                  </span>
                </div>
              </>
            )}
        <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="Mã GD" value={t.payment?.transactionCode || "—"} />
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Giá vé</span>
          <span className="font-bold text-emerald-600">{fmtPrice(t.price)}</span>
        </div>
        {t.bookedAt && (
          <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Đặt lúc" value={new Date(t.bookedAt).toLocaleString("vi-VN")} />
        )}
        {t.paidAt && (
          <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Thanh toán lúc" value={new Date(t.paidAt).toLocaleString("vi-VN")} />
        )}
      </div>

      {/* Nút hành động */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
        <button
          onClick={onConfirm}
          disabled={!isConfirmable || acting}
          className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white text-xs font-bold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all"
        >
          <Check className="w-3.5 h-3.5" />
          {acting ? "..." : "Xác nhận"}
        </button>
        <button
          onClick={onCancel}
          disabled={!isCancellable || acting}
          className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white text-xs font-bold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all"
        >
          <XCircle className="w-3.5 h-3.5" />
          {acting ? "..." : "Hủy vé"}
        </button>
      </div>

      {isConfirmable && (
        <p className="text-[10px] text-slate-500 italic text-center pt-1">
          Vé chờ admin gọi điện xác nhận điểm đón/trả rồi bấm Xác nhận.
        </p>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-500 flex items-center gap-1.5">{icon}{label}</span>
      <span className="font-medium text-slate-800 text-right truncate">{value}</span>
    </div>
  );
}
