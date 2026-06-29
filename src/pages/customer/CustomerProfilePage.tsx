// ============================================================================
// CUSTOMER PROFILE PAGE — Trang hồ sơ cá nhân
// Cho phép customer xem + sửa fullName/phone, xem lịch sử chuyến đã đi
// ============================================================================

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getProfile, updateProfile, getMyTickets, TicketRecord } from "../../api/customer";
import { useAuthStore } from "../../stores/authStore";

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

export default function CustomerProfilePage() {
  const { setUser, user } = useAuthStore();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tripHistory, setTripHistory] = useState<TicketRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    getProfile()
      .then((profile) => {
        setFullName(profile.fullName ?? "");
        setPhone(profile.phone ?? user?.phone ?? "");
      })
      .catch(() => toast.error("Không tải được hồ sơ"))
      .finally(() => setLoading(false));

    // Load trip history (chỉ những vé đã được admin xác nhận → coi như chuyến đã hoàn thành)
    getMyTickets()
      .then((tickets) => {
        const confirmedTickets = tickets.filter((t) => t.status === "CONFIRMED");
        setTripHistory(confirmedTickets);
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [user?.phone]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("Họ tên không được để trống");
      return;
    }
    if (!phone.trim()) {
      toast.error("Số điện thoại không được để trống");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ fullName: fullName.trim(), phone: phone.trim() });
      if (user) {
        setUser({
          ...user,
          fullName: fullName.trim(),
          phone: phone.trim(),
        });
      }
      toast.success("Cập nhật hồ sơ thành công");
    } catch {
      toast.error("Cập nhật thất bại, vui lòng thử lại");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="rounded-2xl bg-white p-10 text-center text-sm text-pink-400 shadow-sm">
        Đang tải...
      </div>
    );

  return (
    <div className="space-y-5">
      {/* ===== HỒ SƠ CÁ NHÂN ===== */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-base font-semibold text-pink-900 mb-5">
          Hồ sơ cá nhân
        </h1>
        <div className="space-y-4">
          <label className="block text-sm font-medium text-pink-700">
            Tên đăng nhập
            <input
              value={user?.username ?? ""}
              disabled
              className="mt-1 w-full rounded-xl border border-pink-200 bg-slate-50 px-3 py-2 text-sm text-pink-400 cursor-not-allowed"
            />
          </label>
          <label className="block text-sm font-medium text-pink-700">
            Email
            <input
              value={user?.email ?? ""}
              disabled
              className="mt-1 w-full rounded-xl border border-pink-200 bg-slate-50 px-3 py-2 text-sm text-pink-400 cursor-not-allowed"
            />
          </label>
          <label className="block text-sm font-medium text-pink-700">
            Họ và tên
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:border-pink-500"
            />
          </label>
          <label className="block text-sm font-medium text-pink-700">
            Số điện thoại mặc định
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nhập số điện thoại"
              className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:border-pink-500"
            />
            <span className="text-xs text-pink-400 mt-0.5 block">
              Sẽ được điền sẵn khi đặt vé lần sau.
            </span>
          </label>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-pink-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60 hover:bg-pink-700 transition"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>

      {/* ===== LỊCH SỬ CHUYẾN ĐI ===== */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="border-b border-pink-100 px-6 py-4">
          <h2 className="text-base font-semibold text-pink-900">Lịch sử chuyến đi</h2>
          <p className="text-sm text-pink-400">
            {tripHistory.length} chuyến đã hoàn thành
          </p>
        </div>

        {loadingHistory ? (
          <div className="p-10 text-center text-sm text-pink-400">
            Đang tải lịch sử...
          </div>
        ) : tripHistory.length === 0 ? null : (
          <div className="divide-y divide-slate-100">
            {tripHistory.map((ticket) => (
              <div
                key={ticket.id}
                className="px-6 py-4 bg-pink-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Tuyến đường */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-pink-900 text-sm">
                        {(ticket.origin || ticket.destination) ? `${ticket.origin} → ${ticket.destination}` : 'Chuyến xe'}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Đã hoàn thành
                      </span>
                    </div>
                    
                    {/* Thông tin chi tiết */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-pink-600">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{fmtDateTime(ticket.departureTime)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Ghế {ticket.seatNumber}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                        </svg>
                        <span>{ticket.busLabel}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span className="font-medium text-[#0F2849]">{fmtPrice(ticket.price)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mã vé */}
                  <div className="text-right shrink-0">
                    <div className="text-xs text-pink-400">Mã vé</div>
                    <div className="font-mono text-sm text-pink-600">#{ticket.id}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
