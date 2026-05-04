import { useMemo, useState } from "react";
import { Check, ChevronRight, Phone } from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import {
  searchTrips,
  getTripSeats,
  bookTicket,
  TripSearchResult,
  SeatStatus,
  TicketRecord,
} from "../../api/customer";

type Step = "search" | "seats" | "confirm" | "success";

const LOCATIONS = [
  "Hà Nội",
  "TP.HCM",
  "Đà Nẵng",
  "Cần Thơ",
  "Huế",
  "Nha Trang",
  "Vũng Tàu",
  "Đà Lạt",
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
  const [origin, setOrigin] = useState(LOCATIONS[0]);
  const [destination, setDestination] = useState(LOCATIONS[1]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [trips, setTrips] = useState<TripSearchResult[]>([]);
  const [seats, setSeats] = useState<SeatStatus[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<TripSearchResult | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<SeatStatus | null>(null);
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [bookedTicket, setBookedTicket] = useState<TicketRecord | null>(null);

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

  const handleStepClick = (target: Step) => {
    if (!canGoToStep(target)) {
      if (target === "seats") {
        toast("Hãy tìm chuyến và bấm Chọn/Xem ghế để mở bước này.");
      }
      return;
    }
    setStep(target);
  };

  const handleSearch = async () => {
    if (!origin || !destination || !date) {
      toast.error("Vui lòng nhập đầy đủ thông tin tìm kiếm");
      return;
    }

    if (origin === destination) {
      toast.error("Điểm đi và điểm đến không được trùng nhau");
      return;
    }

    setSearching(true);
    setSearched(true);
    setTrips([]);
    setSelectedTrip(null);
    setSelectedSeat(null);
    setBookedTicket(null);
    setStep("search");

    try {
      const data = await searchTrips({ origin, destination, date });
      setTrips(data);
    } catch {
      toast.error("Không thể tìm chuyến, vui lòng thử lại");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectTrip = async (trip: TripSearchResult) => {
    if (trip.availableSeats === 0) {
      toast("Chuyến này đã hết ghế, bạn có thể xem sơ đồ để kiểm tra lại.");
    }

    setSelectedTrip(trip);
    setSelectedSeat(null);
    setSeats([]);
    setLoadingSeats(true);

    try {
      const data = await getTripSeats(trip.id);
      setSeats(data);
      setStep("seats");
    } catch {
      toast.error("Không tải được sơ đồ ghế");
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
      toast.success("Đặt vé thành công! Vé của bạn đã được xác nhận.");
    } catch {
      toast.error("Đặt vé thất bại, vui lòng thử lại");
    } finally {
      setConfirming(false);
    }
  };

  const handleReset = () => {
    setStep("search");
    setSearched(false);
    setTrips([]);
    setSeats([]);
    setSelectedTrip(null);
    setSelectedSeat(null);
    setBookedTicket(null);
    setPhone(user?.phone ?? "");
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
                    ? "bg-[#0F2849] text-white"
                    : isDone
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-500"
                } ${isEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}
              >
                {isDone ? <Check className="h-3 w-3" /> : i + 1}
              </button>
              <button
                type="button"
                onClick={() => handleStepClick(s)}
                disabled={!isEnabled}
                className={`text-xs ${isActive ? "font-semibold text-slate-900" : "text-slate-400"} ${isEnabled ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                {STEP_LABELS[s]}
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 mx-1" />
              )}
            </div>
          );
        })}
      </div>

      {step === "search" && (
        <p className="text-xs text-slate-500">
          Bước 2 sẽ mở sau khi bạn chọn một chuyến trong danh sách kết quả.
        </p>
      )}

      {/* ===== BƯỚC 1: TÌM CHUYẾN ===== */}
      {step === "search" && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Tìm chuyến xe
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium text-slate-700">
                Điểm đi
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0F2849]"
                >
                  <option value="">-- Chọn --</option>
                  {LOCATIONS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Điểm đến
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0F2849]"
                >
                  <option value="">-- Chọn --</option>
                  {LOCATIONS.filter((l) => l !== origin).map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Ngày đi
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0F2849]"
                />
              </label>
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="mt-4 w-full rounded-xl bg-[#0F2849] py-2.5 text-sm font-semibold text-white hover:bg-[#1a3a6b] disabled:opacity-60"
            >
              {searching ? "Đang tìm..." : "Tìm chuyến"}
            </button>
          </div>

          {/* Kết quả tìm kiếm */}
          {searched && trips.length === 0 && (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <p className="text-slate-500">
                Không tìm thấy chuyến nào cho hành trình này.
              </p>
            </div>
          )}

          {trips.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">
                Tìm thấy {trips.length} chuyến
              </p>
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                      <span>{fmtTime(trip.departureTime)}</span>
                      <span className="text-slate-300">→</span>
                      <span>{fmtTime(trip.arrivalTime)}</span>
                      <span className="text-xs font-normal text-slate-400">
                        {fmtDate(trip.departureTime)}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500">
                      {trip.busLabel} ·{" "}
                      <span
                        className={
                          trip.availableSeats <= 3 && trip.availableSeats > 0
                            ? "font-semibold text-amber-600"
                            : ""
                        }
                      >
                        Còn {trip.availableSeats}/{trip.totalSeats} ghế
                        {trip.availableSeats <= 3 &&
                          trip.availableSeats > 0 &&
                          " — Sắp hết!"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-[#0F2849]">
                      {fmtPrice(trip.basePrice)}
                    </span>
                    <button
                      onClick={() => handleSelectTrip(trip)}
                      className="rounded-xl bg-[#0F2849] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a3a6b]"
                    >
                      {trip.availableSeats === 0 ? "Xem ghế" : "Chọn"}
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
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Chọn ghế ngồi
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {selectedTrip.origin} → {selectedTrip.destination} ·{" "}
                {fmtTime(selectedTrip.departureTime)} · {selectedTrip.busLabel}
              </p>
            </div>
            <button
              onClick={() => setStep("search")}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              ← Quay lại
            </button>
          </div>

          <div className="mb-4 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-4 w-4 rounded border border-emerald-300 bg-emerald-100" />
              Còn trống
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-4 w-4 rounded border border-red-200 bg-red-50" />
              Đã đặt
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-4 w-4 rounded border border-blue-700 bg-blue-700" />
              Đang chọn
            </span>
          </div>

          {loadingSeats ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Đang tải sơ đồ ghế...
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
              {seats.map((seat) => (
                <button
                  key={seat.id}
                  onClick={() => handleSelectSeat(seat)}
                  disabled={seat.booked}
                  className={`rounded-lg border py-2 text-xs font-medium transition ${
                    seat.booked
                      ? "cursor-not-allowed border-red-200 bg-red-50 text-red-300"
                      : selectedSeat?.id === seat.id
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400"
                  }`}
                >
                  {seat.seatNumber}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Đã chọn:{" "}
              <strong>{selectedSeat?.seatNumber ?? "Chưa chọn"}</strong>
              {" · "}
              Còn <strong>{availableSeats}</strong>/{seats.length} ghế
            </p>
            <button
              onClick={() => setStep("confirm")}
              disabled={!selectedSeat}
              className="rounded-xl bg-[#0F2849] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a3a6b] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              Tiếp tục xác nhận
            </button>
          </div>
        </div>
      )}

      {/* ===== BƯỚC 3: XÁC NHẬN & THANH TOÁN COD ===== */}
      {step === "confirm" && selectedTrip && selectedSeat && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Xác nhận đặt vé
            </h2>
            <button
              onClick={() => setStep("seats")}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              ← Quay lại
            </button>
          </div>

          {/* Tóm tắt thông tin chuyến */}
          <div className="mb-5 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
            {[
              ["Tuyến", `${selectedTrip.origin} → ${selectedTrip.destination}`],
              ["Ngày đi", fmtDate(selectedTrip.departureTime)],
              ["Giờ khởi hành", fmtTime(selectedTrip.departureTime)],
              ["Xe", selectedTrip.busLabel],
              ["Số ghế", selectedSeat.seatNumber],
              ["Hành khách", user?.fullName ?? ""],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-slate-900">{value}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
              <span className="text-slate-500">Giá vé</span>
              <span className="font-bold text-[#0F2849] text-base">
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
                <div className="font-semibold text-slate-900">Thanh toán khi lên xe (COD)</div>
                <div className="text-xs text-slate-500">
                  Bạn sẽ thanh toán trực tiếp cho nhân viên khi lên xe
                </div>
              </div>
            </div>
          </div>

          {/* Nhập SĐT */}
          <div className="mb-5">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Số điện thoại liên hệ
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 focus-within:border-[#0F2849]">
              <Phone className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại để nhân viên xác nhận vé"
                className="w-full border-none bg-transparent text-sm outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Nhân viên sẽ gọi xác nhận chỗ ngồi và hướng dẫn thanh toán khi bạn lên xe.
            </p>
          </div>

          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full rounded-xl bg-[#0F2849] py-3 text-sm font-semibold text-white hover:bg-[#1a3a6b] disabled:opacity-60"
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
            <h2 className="text-xl font-bold text-slate-900">
              Đặt vé thành công!
            </h2>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
              <Check className="h-4 w-4" />
              Đã xác nhận
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Mã vé{" "}
              <span className="font-semibold text-slate-700">
                #{bookedTicket.id}
              </span>
            </p>
          </div>

          {/* Ticket card */}
          <div className="mx-auto max-w-sm space-y-3 rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 text-sm">
            <div className="text-center text-base font-bold text-[#0F2849]">
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
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-slate-800">{value}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-emerald-200 pt-2 mt-2">
              <span className="font-semibold text-emerald-700">Thanh toán</span>
              <span className="font-bold text-emerald-600 text-base">
                COD - Khi lên xe
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-emerald-700">Giá vé</span>
              <span className="font-bold text-emerald-600 text-base">
                {fmtPrice(selectedTrip.basePrice)}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Bạn sẽ thanh toán trực tiếp cho nhân viên khi lên xe</span>
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/customer/tickets"
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Xem vé của tôi
            </Link>
            <button
              onClick={handleReset}
              className="rounded-xl bg-[#0F2849] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1a3a6b]"
            >
              Đặt vé khác
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
