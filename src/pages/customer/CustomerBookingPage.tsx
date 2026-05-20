import { useEffect, useMemo, useState } from "react";
import { Check, X, ChevronRight, Phone, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import {
  getAllUpcomingTrips,
  getTripSeats,
  bookTicket,
  TripSearchResult,
  SeatStatus,
  TicketRecord,
} from "../../api/customer";

type Step = "search" | "seats" | "confirm" | "success";

const LOCATIONS = [
  "Hà Nội", "TP.HCM", "Đà Nẵng", "Cần Thơ", "Huế",
  "Nha Trang", "Vũng Tàu", "Đà Lạt", "Hải Phòng", "Quảng Ninh",
  "Bình Dương", "Cà Mau", "An Giang", "Kiên Giang", "Nghệ An"
];

const fmtTime = (dt: string) =>
  new Date(dt).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtDate = (dt: string) =>
  new Date(dt).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const fmtPrice = (p: number) =>
  p.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

const STEP_LABELS: Record<Step, string> = {
  search: "Tìm chuyến",
  seats: "Chọn ghế",
  confirm: "Xác nhận",
  success: "Hoàn tất",
};
const STEPS: Step[] = ["search", "seats", "confirm", "success"];

export default function CustomerBookingPage() {
  const user = useAuthStore((state) => state.user);

  const [step, setStep] = useState<Step>("search");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [loadingTrips, setLoadingTrips] = useState(false);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [trips, setTrips] = useState<TripSearchResult[]>([]);
  const [seats, setSeats] = useState<SeatStatus[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<TripSearchResult | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<SeatStatus | null>(null);
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [bookedTicket, setBookedTicket] = useState<TicketRecord | null>(null);

  // Load tất cả chuyến tương lai khi vào trang (mặc định)
  const loadTrips = async () => {
    setLoadingTrips(true);
    try {
      const data = await getAllUpcomingTrips({ date });
      setTrips(data);
    } catch {
      toast.error("Không tải được danh sách chuyến, vui lòng thử lại");
    } finally {
      setLoadingTrips(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const availableSeats = useMemo(
    () => seats.filter((seat) => !seat.booked).length,
    [seats],
  );

  const canGoToStep = (target: Step) => {
    if (target === "search") return true;
    if (target === "seats") return !!selectedTrip;
    if (target === "confirm") return !!selectedTrip && !!selectedSeat;
    if (target === "success") return !!bookedTicket;
    return false;
  };

  const handleReset = () => {
    setStep("search");
    setTrips([]);
    setSeats([]);
    setSelectedTrip(null);
    setSelectedSeat(null);
    setBookedTicket(null);
    setPhone(user?.phone ?? "");
    loadTrips();
  };

  const handleStepClick = (target: Step) => {
    if (!canGoToStep(target)) {
      if (target === "seats") {
        toast("Hãy chọn một chuyến để mở bước này.");
      }
      return;
    }
    setStep(target);
  };

  // Tìm kiếm theo origin/destination/date - vẫn giữ nguyên filter
  const handleSearch = () => {
    // Nếu có origin và destination thì filter, không thì hiển thị tất cả
    if (!origin && !destination) {
      // Không nhập gì = hiển thị tất cả chuyến trong ngày
      loadTrips();
      return;
    }

    if (origin && destination && origin === destination) {
      toast.error("Điểm đi và điểm đến không được trùng nhau");
      return;
    }

    // Filter trips theo origin/destination/date
    const filtered = trips.filter((trip) => {
      const matchOrigin = !origin ||
        trip.origin.toLowerCase().includes(origin.toLowerCase());
      const matchDest = !destination ||
        trip.destination.toLowerCase().includes(destination.toLowerCase());
      return matchOrigin && matchDest;
    });
    setTrips(filtered);
  };

  const handleSelectTrip = async (trip: TripSearchResult) => {
    setSelectedTrip(trip);
    setSelectedSeat(null);
    setSeats([]);
    setLoadingSeats(true);

    try {
      const data = await getTripSeats(trip.id);
      setSeats(data);
      setStep("seats");
    } catch (err: any) {
      // Nếu backend trả lỗi "chưa gán xe" hoặc "số ghế hợp lệ"
      const msg = err?.response?.data?.message ?? err?.message ?? "";
      if (msg.includes("chưa được gán xe") || msg.includes("không có số ghế")) {
        toast.error(msg);
      } else {
        toast.error("Không tải được sơ đồ ghế");
      }
    } finally {
      setLoadingSeats(false);
    }
  };

  const handleSelectSeat = (seat: SeatStatus) => {
    if (seat.booked) return;
    setSelectedSeat(seat);
  };

  const handleConfirm = async () => {
    if (!selectedTrip || !selectedSeat) {
      toast.error("Vui lòng chọn chuyến và ghế");
      return;
    }

    if (!phone.trim()) {
      toast.error("Vui lòng nhập số điện thoại");
      return;
    }

    setConfirming(true);
    try {
      const ticket = await bookTicket({
        tripId: selectedTrip.id,
        seatId: selectedSeat.id,
        price: selectedTrip.basePrice,
        passengerPhone: phone.trim(),
      });
      setBookedTicket(ticket);
      setStep("success");
      toast.success("Đặt vé thành công! Nhân viên sẽ gọi xác nhận trước khi khởi hành.");
    } catch {
      toast.error("Đặt vé thất bại, vui lòng thử lại");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-1 text-sm">
        {STEPS.map((s, i) => {
          const stepIndex = STEPS.indexOf(step);
          const isActive = s === step;
          const isDone = i < stepIndex;
          const isEnabled = canGoToStep(s);
          return (
            <div key={s} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleStepClick(s)}
                disabled={!isEnabled}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isActive
                    ? "bg-pink-600 text-white"
                    : isDone
                      ? "bg-emerald-500 text-white"
                      : "bg-pink-100 text-pink-400"
                } ${isEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}
              >
                {isDone ? <Check className="h-3 w-3" /> : i + 1}
              </button>
              <button
                type="button"
                onClick={() => handleStepClick(s)}
                disabled={!isEnabled}
                className={`text-xs ${isActive ? "font-semibold text-pink-700" : "text-pink-300"} ${isEnabled ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                {STEP_LABELS[s]}
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-pink-300 mx-1" />
              )}
            </div>
          );
        })}
      </div>

      {step === "search" && (
        <p className="text-xs text-pink-500">
          Bước 2 sẽ mở sau khi bạn chọn một chuyến trong danh sách kết quả.
        </p>
      )}

      {/* ===== BƯỚC 1: DANH SÁCH CHUYẾN ===== */}
      {step === "search" && (
        <div className="space-y-4">
          {/* Form tìm kiếm */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-pink-900">
              Tìm chuyến xe
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium text-pink-700">
                Điểm đi
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="customer-input mt-1 w-full px-3 py-2 text-sm"
                >
                  <option value="">-- Tất cả --</option>
                  {LOCATIONS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-pink-700">
                Điểm đến
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="customer-input mt-1 w-full px-3 py-2 text-sm"
                >
                  <option value="">-- Tất cả --</option>
                  {LOCATIONS.filter((l) => l !== origin).map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-pink-700">
                Ngày đi
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDate(e.target.value)}
                  className="customer-input mt-1 w-full px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSearch}
                className="customer-btn-primary py-2.5 text-sm font-semibold text-white px-6"
              >
                Tìm kiếm
              </button>
              <button
                onClick={() => {
                  setOrigin("");
                  setDestination("");
                  loadTrips();
                }}
                className="rounded-xl border border-pink-200 px-4 py-2 text-sm text-pink-600 hover:bg-pink-50"
              >
                Xem tất cả
              </button>
            </div>
          </div>

          {/* Danh sách chuyến - hiển thị tất cả chuyến admin đã tạo */}
          {loadingTrips ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
              <div className="animate-spin h-8 w-8 border-2 border-pink-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-pink-500">Đang tải danh sách chuyến...</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <div className="text-4xl mb-3">🚌</div>
              <p className="text-pink-600 font-medium mb-1">Không có chuyến nào trong khoảng thời gian này.</p>
              <p className="text-sm text-pink-400">Hãy thử chọn ngày khác.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-pink-500 font-medium">
                {trips.length} chuyến khả dụng
              </p>
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm hover:shadow-md transition cursor-pointer"
                  onClick={() => handleSelectTrip(trip)}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    {/* Tuyến đường */}
                    <div className="flex items-center gap-2 text-base font-semibold text-pink-900">
                      <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded-lg text-sm font-bold">
                        {trip.origin}
                      </span>
                      <span className="text-pink-400">→</span>
                      <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded-lg text-sm font-bold">
                        {trip.destination}
                      </span>
                    </div>
                    {/* Thời gian & ngày */}
                    <div className="flex items-center gap-3 text-sm text-pink-500">
                      <span className="flex items-center gap-1">
                        <span className="font-semibold text-pink-700">{fmtTime(trip.departureTime)}</span>
                        <span className="text-pink-300">→</span>
                        <span>{fmtTime(trip.arrivalTime)}</span>
                      </span>
                      <span className="text-pink-300">·</span>
                      <span className="text-pink-400">{fmtDate(trip.departureTime)}</span>
                      <span className="text-pink-300">·</span>
                      <span>{trip.busLabel}</span>
                    </div>
                    {/* Ghế - hiển thị chi tiết */}
                    <div className="text-sm">
                      {!trip.busLabel || trip.busLabel === "" ? (
                        <span className="text-amber-600">⚠️ Chưa gán xe cho chuyến</span>
                      ) : trip.totalSeats === 0 ? (
                        <span className="text-amber-600">⚠️ Xe chưa cấu hình ghế</span>
                      ) : trip.availableSeats === 0 ? (
                        <span className="font-semibold text-red-500">Hết ghế</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-pink-100 rounded-full overflow-hidden max-w-[120px]">
                            <div
                              className={`h-full rounded-full transition-all ${
                                (trip.totalSeats - trip.availableSeats) / trip.totalSeats >= 0.8
                                  ? "bg-red-400"
                                  : (trip.totalSeats - trip.availableSeats) / trip.totalSeats >= 0.5
                                    ? "bg-amber-400"
                                    : "bg-emerald-400"
                              }`}
                              style={{ width: `${Math.min(100, ((trip.totalSeats - trip.availableSeats) / trip.totalSeats) * 100)}%` }}
                            />
                          </div>
                          <span
                            className={
                              trip.availableSeats <= 3 && trip.availableSeats > 0
                                ? "font-semibold text-amber-600"
                                : "text-emerald-600"
                            }
                          >
                            Còn <strong>{trip.availableSeats}</strong>/{trip.totalSeats} ghế
                            {trip.availableSeats <= 3 && trip.availableSeats > 0 && " — Sắp hết!"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span className="text-base font-bold text-pink-600">
                      {fmtPrice(trip.basePrice)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSelectTrip(trip); }}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        trip.totalSeats === 0
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : trip.availableSeats === 0
                            ? "bg-red-100 text-red-600 hover:bg-red-200"
                            : "customer-btn-primary text-white"
                      }`}
                      title={
                        trip.totalSeats === 0
                          ? "Xe chưa có ghế"
                          : trip.availableSeats === 0
                            ? "Hết ghế - Xem sơ đồ"
                            : `Đặt vé (${trip.availableSeats} ghế còn)`
                      }
                    >
                      {trip.totalSeats === 0 ? "Không có ghế" : trip.availableSeats === 0 ? "Xem ghế" : "Chọn"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== BƯỚC 2: CHỌN GHẾ ===== */}
      {step === "seats" && selectedTrip && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          {/* Trip info header */}
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-pink-900">
                Chọn ghế ngồi
              </h2>
              <p className="mt-0.5 text-sm text-pink-500">
                {selectedTrip.origin} → {selectedTrip.destination} ·{" "}
                {fmtTime(selectedTrip.departureTime)} · {selectedTrip.busLabel}
              </p>
            </div>
            <button
              onClick={() => setStep("search")}
              className="text-sm text-pink-400 hover:text-pink-600"
            >
              ← Quay lại
            </button>
          </div>

          {/* Seat stats */}
          <div className="mb-4 flex gap-3 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 font-medium">
              <Check className="h-3.5 w-3.5" />
              Còn trống: <strong>{seats.filter(s => !s.booked).length}</strong> ghế
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-red-600 font-medium">
              <X className="h-3.5 w-3.5" />
              Đã đặt: <strong>{seats.filter(s => s.booked).length}</strong> ghế
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-blue-700 font-medium">
              Tổng: <strong>{selectedTrip.totalSeats}</strong> ghế
            </span>
          </div>

          {/* Legend */}
          <div className="mb-4 flex gap-5 text-xs text-pink-500">
            <span className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded border border-emerald-300 bg-emerald-100">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              </span>
              Còn trống
            </span>
            <span className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded border border-red-200 bg-red-100">
                <X className="h-3.5 w-3.5 text-red-400" />
              </span>
              Đã đặt
            </span>
            <span className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded border border-blue-700 bg-blue-600 text-white">
                <Check className="h-3.5 w-3.5 text-white" />
              </span>
              Đang chọn
            </span>
          </div>

          {/* Seat map */}
          {loadingSeats ? (
            <div className="py-12 text-center text-sm text-pink-400">
              Đang tải sơ đồ ghế...
            </div>
          ) : seats.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-pink-200 py-10 text-center">
              <div className="text-4xl mb-3">🚌</div>
              <p className="text-pink-600 font-medium mb-1">Xe chưa được cấu hình ghế.</p>
              <p className="text-sm text-pink-400">Vui lòng liên hệ nhân viên để được hỗ trợ.</p>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
              {seats.map((seat) => (
                <button
                  key={seat.id}
                  onClick={() => handleSelectSeat(seat)}
                  disabled={seat.booked}
                  title={
                    seat.booked
                      ? `Ghế ${seat.seatNumber} - Đã có người đặt`
                      : `Ghế ${seat.seatNumber} - Còn trống`
                  }
                  className={`relative flex h-11 flex-col items-center justify-center rounded-lg border text-xs font-medium transition-all ${
                    seat.booked
                      ? "cursor-not-allowed border-red-200 bg-red-50 text-red-300"
                      : selectedSeat?.id === seat.id
                        ? "border-blue-700 bg-blue-600 text-white shadow-md ring-2 ring-blue-400"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100 cursor-pointer"
                  }`}
                >
                  {seat.booked ? (
                    <X className="h-4 w-4 text-red-400" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span className="text-[10px] mt-0.5">{seat.seatNumber}</span>
                </button>
              ))}
            </div>
          )}

          {/* Selected seat + action */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-pink-600">
              {selectedSeat ? (
                <>
                  <span className="font-semibold">Đã chọn: Ghế {selectedSeat.seatNumber}</span>
                  {!selectedSeat.booked && (
                    <span className="ml-2 text-emerald-600 text-xs">✓ Còn trống, sẵn sàng đặt</span>
                  )}
                </>
              ) : (
                <span>Chưa chọn ghế nào</span>
              )}
            </div>
            <button
              onClick={() => setStep("confirm")}
              disabled={!selectedSeat || selectedSeat.booked}
              className="rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-pink-800 transition"
            >
              {selectedSeat ? "Tiếp tục xác nhận" : "Chọn ghế để tiếp tục"}
            </button>
          </div>
        </div>
      )}

      {/* ===== BƯỚC 3: XÁC NHẬN & THANH TOÁN COD ===== */}
      {step === "confirm" && selectedTrip && selectedSeat && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-pink-900">
              Xác nhận đặt vé
            </h2>
            <button
              onClick={() => setStep("seats")}
              className="text-sm text-pink-400 hover:text-pink-600"
            >
              ← Quay lại
            </button>
          </div>

          {/* Tóm tắt thông tin chuyến */}
          <div className="mb-5 space-y-2 rounded-xl bg-pink-50 p-4 text-sm">
            {[
              ["Tuyến", `${selectedTrip.origin} → ${selectedTrip.destination}`],
              ["Ngày đi", fmtDate(selectedTrip.departureTime)],
              ["Giờ khởi hành", fmtTime(selectedTrip.departureTime)],
              ["Xe", selectedTrip.busLabel],
              ["Số ghế", selectedSeat.seatNumber],
              ["Hành khách", user?.fullName ?? ""],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-pink-500">{label}</span>
                <span className="font-medium text-pink-900">{value}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-pink-200 pt-2 mt-2">
              <span className="text-pink-500">Giá vé</span>
              <span className="font-bold text-pink-600 text-base">
                {fmtPrice(selectedTrip.basePrice)}
              </span>
            </div>
          </div>

          {/* Thanh toán COD */}
          <div className="mb-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white shrink-0">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-pink-900">Thanh toán khi lên xe (COD)</div>
                <div className="text-xs text-pink-500">
                  Bạn sẽ thanh toán trực tiếp cho nhân viên khi lên xe
                </div>
              </div>
            </div>
          </div>

          {/* Nhập SĐT */}
          <div className="mb-5">
            <label className="mb-1 block text-sm font-medium text-pink-700">
              Số điện thoại liên hệ
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-pink-200 px-3 py-2 focus-within:border-pink-500">
              <Phone className="h-4 w-4 text-pink-400 shrink-0" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại để nhân viên xác nhận vé"
                className="w-full border-none bg-transparent text-sm outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-pink-400">
              Nhân viên sẽ gọi xác nhận chỗ ngồi và hướng dẫn thanh toán khi bạn lên xe.
            </p>
          </div>

          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full rounded-xl bg-pink-600 py-3 text-sm font-semibold text-white bg-pink-700 disabled:opacity-60"
          >
            {confirming ? "Đang xử lý..." : "Xác nhận đặt vé (COD)"}
          </button>
        </div>
      )}

      {/* ===== BƯỚC 4: THÀNH CÔNG ===== */}
      {step === "success" && bookedTicket && selectedTrip && selectedSeat && (
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-7 w-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-pink-900">
              Đặt vé thành công!
            </h2>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
              <Check className="h-4 w-4" />
              Chờ xác nhận
            </div>
            <p className="mt-2 text-sm text-pink-500">
              Mã vé{" "}
              <span className="font-semibold text-pink-700">
                #{bookedTicket.id}
              </span>
            </p>
          </div>

          {/* Ticket card */}
          <div className="mx-auto max-w-sm space-y-3 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 text-sm">
            <div className="text-center text-base font-bold text-pink-600">
              {selectedTrip.origin} → {selectedTrip.destination}
            </div>
            {[
              ["Ngày đi", fmtDate(selectedTrip.departureTime)],
              ["Giờ khởi hành", fmtTime(selectedTrip.departureTime)],
              ["Xe", selectedTrip.busLabel],
              ["Ghế số", selectedSeat.seatNumber],
              ["Hành khách", bookedTicket.passengerName],
              ["Liên hệ", bookedTicket.passengerPhone],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-pink-500">{label}</span>
                <span className="font-medium text-pink-800">{value}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-blue-200 pt-2 mt-2">
              <span className="font-semibold text-blue-700">Thanh toán</span>
              <span className="font-bold text-blue-600 text-base">
                COD - Khi lên xe
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-blue-700">Giá vé</span>
              <span className="font-bold text-blue-600 text-base">
                {fmtPrice(selectedTrip.basePrice)}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-pink-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Nhân viên sẽ gọi xác nhận trước khi khởi hành</span>
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/customer/tickets"
              className="rounded-xl border border-pink-200 px-5 py-2.5 text-sm font-semibold text-pink-700 hover:bg-pink-50"
            >
              Xem vé của tôi
            </Link>
            <button
              onClick={handleReset}
              className="rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white bg-pink-700"
            >
              Đặt vé khác
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
