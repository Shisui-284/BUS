// ============================================================================
// PAYMENT RETURN PAGE — Trang nhận kết quả từ VNPay
// Flow:
//   1. VNPay redirect user về /payment/vnpay-return kèm query params
//   2. Trang này gọi backend /api/public/payment/vnpay/return để xác thực
//   3. Nếu thành công: poll getMyTickets() đợi IPN cập nhật DB
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, X, Loader2, Ticket as TicketIcon, Home, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { getMyTickets, getVnpayReturnInfo, VnpayReturnInfo } from "../../api/customer";

/**
 * Trang nhận kết quả trả về từ VNPay sau khi user thanh toán.
 *
 * Flow:
 * 1. VNPay redirect user về /payment/vnpay-return kèm query params (vnp_ResponseCode, vnp_TxnRef...)
 * 2. Trang này gọi backend /api/public/payment/vnpay/return để xác thực và parse dữ liệu
 * 3. Nếu thanh toán thành công: hiển thị thông tin + poll getMyTickets() để đợi IPN
 *    cập nhật trạng thái vé trên DB. Poll sẽ tự động dừng khi thấy PAID hoặc hết max attempts.
 * 4. Nếu IPN chưa kịp cập nhật (polling timeout): vẫn hiện thành công nhưng kèm cảnh báo
 *    "vui lòng kiểm tra lại sau" — user có thể refresh trang hoặc vào "Vé của tôi".
 */
export default function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [returnInfo, setReturnInfo] = useState<VnpayReturnInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "found" | "timeout">("idle");
  const pollingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bước 1: lấy thông tin return từ VNPay
  useEffect(() => {
    const fetchReturnInfo = async () => {
      try {
        const queryString = searchParams.toString();
        const info = await getVnpayReturnInfo(queryString ? `?${queryString}` : "");
        setReturnInfo(info);
      } catch {
        // keep returnInfo as null → show error screen
      } finally {
        setLoadingInfo(false);
      }
    };
    fetchReturnInfo();
  }, [searchParams]);

  // Bước 2: nếu thanh toán thành công, poll getMyTickets() để đợi IPN cập nhật DB
  useEffect(() => {
    if (!returnInfo?.success) return;

    setSyncStatus("syncing");
    let attempts = 0;
    const maxAttempts = 15; // 15 × 1.5s = ~22 giây
    let authErrorSeen = false; // dừng poll nếu gặp 401 — tránh spam và làm phiền user

    const poll = async () => {
      attempts++;
      try {
        const tickets = await getMyTickets();
        // Tìm vé khớp txnRef: backend lưu vnpTxnRef dạng "TICKET{id}_{timestamp}"
        const txnRef = returnInfo.txnRef ?? "";
        const matchingTicket = tickets.find(
          (t) => t.transactionCode && t.transactionCode.includes(txnRef),
        );
        if (matchingTicket && matchingTicket.status === "PAID") {
          setSyncStatus("found");
          toast.success("Thanh toán thành công! Vé đã được cập nhật.");
          return;
        }
      } catch (err: any) {
        // Nếu là lỗi 401 (token hết hạn / chưa đăng nhập) → dừng poll ngay
        // vì tiếp tục poll sẽ chỉ spam lỗi. User có thể tự refresh "Vé của tôi" sau.
        const status = err?.response?.status;
        if (status === 401) {
          authErrorSeen = true;
          setSyncStatus("timeout");
          toast("Thanh toán đã được VNPay xác nhận. Vui lòng đăng nhập lại để xem vé.", {
            icon: "ℹ️",
            duration: 6000,
          });
          return;
        }
        // ignore poll error khác, tiếp tục thử
      }

      if (!authErrorSeen && attempts < maxAttempts) {
        pollingTimer.current = setTimeout(poll, 1500);
      } else if (!authErrorSeen) {
        // Hết attempts — IPN chưa kịp cập nhật.
        // Vẫn hiện thành công vì VNPay đã xác nhận thanh toán,
        // nhưng thông báo user kiểm tra lại sau.
        setSyncStatus("timeout");
        toast("Thanh toán đã được xác nhận bởi VNPay. Vui lòng kiểm tra lại vé trong vài phút.", {
          icon: "ℹ️", duration: 6000,
        });
      }
    };

    pollingTimer.current = setTimeout(poll, 800);

    return () => {
      if (pollingTimer.current) clearTimeout(pollingTimer.current);
    };
  }, [returnInfo]);

  // ─── Render ─────────────────────────────────────────────────────────

  if (loadingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full mx-4">
          <Loader2 className="h-12 w-12 animate-spin text-pink-500 mx-auto mb-3" />
          <p className="text-pink-700 font-medium">Đang xác nhận kết quả thanh toán...</p>
        </div>
      </div>
    );
  }

  if (!returnInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md w-full">
          <X className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-pink-900 mb-2">Không có thông tin thanh toán</h1>
          <p className="text-sm text-pink-500 mb-5">
            Không thể trích xuất kết quả từ VNPay. Vui lòng kiểm tra lại trong mục "Vé của tôi".
          </p>
          <button
            onClick={() => navigate("/customer/tickets")}
            className="w-full rounded-xl bg-pink-600 px-4 py-3 text-sm font-semibold text-white hover:bg-pink-700"
          >
            Về trang Vé của tôi
          </button>
        </div>
      </div>
    );
  }

  return (
    <ResultScreen
      success={returnInfo.success}
      title={returnInfo.success ? "Thanh toán thành công!" : "Thanh toán chưa hoàn tất"}
      subtitle={
        returnInfo.success
          ? "Cảm ơn quý khách đã thanh toán qua VNPay"
          : "Giao dịch không thành công hoặc đã bị hủy"
      }
      syncStatus={syncStatus}
      info={returnInfo}
    />
  );
}

interface ResultScreenProps {
  success: boolean;
  title: string;
  subtitle: string;
  syncStatus: "idle" | "syncing" | "found" | "timeout";
  info: VnpayReturnInfo;
}

function ResultScreen({ success, title, subtitle, syncStatus, info }: ResultScreenProps) {
  const navigate = useNavigate();

  const syncDescription = (() => {
    if (!success) return null;
    switch (syncStatus) {
      case "syncing":
        return (
          <span className="inline-flex items-center gap-2 text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang đồng bộ trạng thái vé với hệ thống...
          </span>
        );
      case "found":
        return (
          <span className="text-emerald-600 font-medium flex items-center gap-1">
            <Check className="h-4 w-4" /> Vé đã được cập nhật thành công
          </span>
        );
      case "timeout":
        return (
          <span className="inline-flex items-center gap-2 text-amber-600">
            <RefreshCw className="h-4 w-4" />
            VNPay đã xác nhận thanh toán. Vé sẽ được cập nhật trong vài phút.
          </span>
        );
      default:
        return null;
    }
  })();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-rose-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div
          className={`px-6 py-6 text-white text-center ${
            success ? "bg-gradient-to-r from-emerald-500 to-green-600" : "bg-gradient-to-r from-amber-500 to-rose-500"
          }`}
        >
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            {success ? <Check className="h-9 w-9" /> : <X className="h-9 w-9" />}
          </div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="mt-1 text-sm opacity-90">{subtitle}</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {success && syncDescription && (
            <div className="text-center text-sm">{syncDescription}</div>
          )}

          {/* Info chi tiết */}
          <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
            <InfoRow label="Số tiền" value={formatPrice(info.amount)} highlight />
            <InfoRow label="Mã tham chiếu" value={info.txnRef ?? "—"} mono />
            {info.transactionNo && (
              <InfoRow label="Mã giao dịch VNPay" value={info.transactionNo} mono />
            )}
            {info.bankCode ? <InfoRow label="Ngân hàng" value={info.bankCode} /> : null}
            {info.cardType ? <InfoRow label="Loại thẻ" value={info.cardType} /> : null}
            {info.payDate ? (
              <InfoRow label="Thời gian" value={formatVNPayDate(info.payDate)} />
            ) : null}
            <InfoRow label="Mã phản hồi" value={info.responseCode ?? "—"} />
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <Link
              to="/customer/tickets"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-3 text-sm font-semibold text-white hover:bg-pink-700 transition"
            >
              <TicketIcon className="h-4 w-4" />
              Xem vé của tôi
            </Link>
            <button
              onClick={() => navigate("/customer/booking")}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-pink-200 bg-white px-4 py-3 text-sm font-semibold text-pink-700 hover:bg-pink-50 transition"
            >
              <Home className="h-4 w-4" />
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-400 text-xs">{label}</span>
      <span
        className={`${highlight ? "font-bold text-pink-600 text-base" : "font-medium text-slate-700"} ${mono ? "font-mono text-xs" : ""} text-right`}
      >
        {value}
      </span>
    </div>
  );
}

function formatPrice(amount: number | undefined | null): string {
  if (amount == null || isNaN(amount)) return "—";
  return amount.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}

/** Parse chuỗi ngày VNPay (yyyyMMddHHmmss) sang Date */
function formatVNPayDate(raw: string): string {
  if (!raw || raw.length < 14) return raw;
  const y = raw.slice(0, 4);
  const m = raw.slice(4, 6);
  const d = raw.slice(6, 8);
  const hh = raw.slice(8, 10);
  const mm = raw.slice(10, 12);
  const ss = raw.slice(12, 14);
  return `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
}