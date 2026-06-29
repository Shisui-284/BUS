// ============================================================================
// CUSTOMER BOOKING PAGE — Trang đặt vé (Customer)
// Luồng chính (6 bước):
//   search → pickup → dropoff → seats → confirm → success
// Tích hợp: VNPay payment, JWT auth qua useAuthStore, Toast notification
// ============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X, ChevronRight, ChevronDown, ChevronUp, Phone, MapPin, CreditCard, Smartphone } from "lucide-react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import BookingHero from "../../components/customer/BookingHero";
import {
  searchTrips,
  getAllUpcomingTrips,
  getTripSeats,
  bookTicket,
  createVnpayPayment,
  TripSearchResult,
  SeatStatus,
  TicketRecord,
} from "../../api/customer";
import {
  LOCATION_DATA,
  LOCATIONS,
  getCityData,
  CityData,
  PickupPoint,
} from "../../utils/locations";

type Step =
  | "search"
  | "pickup"
  | "dropoff"
  | "seats"
  | "confirm"
  | "success";

type PaymentMethod = "COD" | "VNPAY";

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
  pickup: "Điểm đón",
  dropoff: "Điểm trả",
  seats: "Chọn ghế",
  confirm: "Xác nhận",
  success: "Hoàn tất",
};
const STEPS: Step[] = ["search", "pickup", "dropoff", "seats", "confirm", "success"];

// ----------------------------------------------------------------
// PaymentMethodCard — lựa chọn phương thức thanh toán
// ----------------------------------------------------------------
interface PaymentMethodCardProps {
  value: "COD" | "VNPAY";
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: string;
  badgeColor?: string;
}
function PaymentMethodCard({
  selected,
  onClick,
  icon,
  title,
  desc,
  badge,
  badgeColor,
}: PaymentMethodCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full rounded-xl border-2 p-3.5 text-left transition-all ${
        selected
          ? "border-pink-500 bg-pink-50 shadow-sm"
          : "border-pink-100 bg-white hover:border-pink-300 hover:bg-pink-50/50"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            selected ? "bg-pink-500 text-white" : "bg-pink-100 text-pink-500"
          }`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className={`text-sm font-semibold ${selected ? "text-pink-900" : "text-pink-700"}`}>
              {title}
            </div>
            {badge && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeColor ?? "bg-pink-100 text-pink-700"}`}>
                {badge}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-pink-500">{desc}</div>
        </div>
        <div
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            selected ? "border-pink-500 bg-pink-500" : "border-pink-200 bg-white"
          }`}
        >
          {selected && <Check className="h-3 w-3 text-white" />}
        </div>
      </div>
    </button>
  );
}

// ----------------------------------------------------------------
// PickupPointCard — hiển thị 1 điểm đón/trả cụ thể
// ----------------------------------------------------------------
interface PointCardProps {
  point: PickupPoint;
  selected: boolean;
  onClick: () => void;
}
function PointCard({ point, selected, onClick }: PointCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-3 transition-all ${
        selected
          ? "border-pink-500 bg-pink-50 shadow-sm ring-2 ring-pink-400"
          : "border-pink-100 bg-white hover:border-pink-300 hover:bg-pink-50"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            selected
              ? "border-pink-500 bg-pink-500"
              : "border-pink-200 bg-white"
          }`}
        >
          {selected && <Check className="h-3 w-3 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold ${selected ? "text-pink-700" : "text-pink-800"}`}>
            {point.name}
          </div>
          <div className="mt-0.5 text-xs text-pink-500">{point.address}</div>
          {point.description && (
            <div className="mt-1 text-xs text-pink-400 italic">{point.description}</div>
          )}
        </div>
        {selected && (
          <span className="shrink-0 rounded-full bg-pink-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            Đã chọn
          </span>
        )}
      </div>
    </button>
  );
}

// ----------------------------------------------------------------
// PointSelector — chọn city → hiện các điểm cụ thể
// ----------------------------------------------------------------
interface PointSelectorProps {
  label: string;
  sublabel: string;
  icon: "pickup" | "dropoff";
  selectedCity: string;
  selectedPoint: PickupPoint | null;
  availableCities: string[];
  lockedCity?: boolean;
  onCityChange: (city: string) => void;
  onPointChange: (point: PickupPoint | null) => void;
}
function PointSelector({
  label,
  sublabel,
  icon,
  selectedCity,
  selectedPoint,
  availableCities,
  lockedCity = false,
  onCityChange,
  onPointChange,
}: PointSelectorProps) {
  // Bỏ chọn tuyến có sẵn - chỉ cần chọn điểm cụ thể, luôn hiện danh sách điểm để chọn nhanh
  const [pointsOpen, setPointsOpen] = useState(true);
  const [showCities, setShowCities] = useState(false);

  const cityData = selectedCity ? getCityData(selectedCity) : undefined;
  const points = cityData?.pickupPoints ?? [];

  const handleCitySelect = (city: string) => {
    onCityChange(city);
    onPointChange(null);
    setShowCities(false);
    setPointsOpen(true);
  };

  const handlePointSelect = (point: PickupPoint) => {
    onPointChange(point);
    setPointsOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            icon === "pickup" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
          }`}
        >
          <MapPin className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold text-pink-900">{label}</div>
          <div className="text-xs text-pink-500">{sublabel}</div>
        </div>
      </div>

      {/* City selector — collapsible */}
      <div>
        <button
          type="button"
          onClick={() => setShowCities((o) => !o)}
          className="flex w-full items-center justify-between rounded-xl border border-pink-200 bg-white px-4 py-2.5 text-sm transition hover:border-pink-400"
        >
          <span className={selectedCity ? "text-pink-800 font-medium" : "text-pink-400"}>
            {selectedCity
              ? `${getCityData(selectedCity)?.cityLabel ?? selectedCity}`
              : "— Chọn thành phố / tỉnh thành —"}
          </span>
          {showCities ? (
            <ChevronUp className="h-4 w-4 text-pink-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-pink-400" />
          )}
        </button>

        {showCities && (
          <div className="mt-1.5 max-h-52 overflow-y-auto rounded-xl border border-pink-200 bg-white shadow-sm">
            {availableCities.length === 0 ? (
              <div className="p-3 text-center text-xs text-pink-400">
                Vui lòng chọn chuyến trước
              </div>
            ) : (
              availableCities.map((city) => {
                const data = getCityData(city);
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => handleCitySelect(city)}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-pink-50 transition ${
                      selectedCity === city
                        ? "bg-pink-100 font-semibold text-pink-700"
                        : "text-pink-700"
                    }`}
                  >
                    <span>{data?.cityLabel ?? city}</span>
                    <span className="text-xs text-pink-400">
                      {data?.pickupPoints.length} điểm
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Points list — always visible */}
      <div>
        <button
          type="button"
          onClick={() => setPointsOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-xl border border-pink-200 bg-pink-50 px-4 py-2.5 text-sm transition hover:border-pink-400"
        >
          <span className={selectedPoint ? "text-pink-800 font-medium" : "text-pink-400"}>
            {selectedPoint ? selectedPoint.name : "— Chọn điểm đón cụ thể —"}
          </span>
          {pointsOpen ? (
            <ChevronUp className="h-4 w-4 text-pink-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-pink-400" />
          )}
        </button>

        {pointsOpen && (
          <div className="mt-1.5 max-h-72 overflow-y-auto space-y-2">
            {!selectedCity ? (
              <div className="rounded-xl border border-dashed border-pink-200 bg-pink-50/40 p-4 text-center">
                <p className="text-xs text-pink-500">
                  Vui lòng chọn thành phố ở mục phía trên để xem các điểm đón cụ thể.
                </p>
              </div>
            ) : points.length === 0 ? (
              <div className="rounded-xl border border-pink-200 bg-white p-4 text-center">
                <p className="text-xs text-pink-500">
                  Chưa có điểm đón nào được cấu hình cho {getCityData(selectedCity)?.cityLabel ?? selectedCity}. Vui lòng liên hệ nhân viên.
                </p>
              </div>
            ) : (
              points.map((point) => (
                <PointCard
                  key={point.id}
                  point={point}
                  selected={selectedPoint?.id === point.id}
                  onClick={() => handlePointSelect(point)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected point summary */}
      {selectedPoint && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <Check className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-emerald-700">{selectedPoint.name}</div>
            <div className="text-xs text-emerald-600">{selectedPoint.address}</div>
            {selectedPoint.description && (
              <div className="text-xs text-emerald-500 mt-0.5">{selectedPoint.description}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Main component
// ----------------------------------------------------------------
export default function CustomerBookingPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  // Flow steps: search → pickup → dropoff → seats → confirm → success
  const [step, setStep] = useState<Step>("search");

  // Search
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Pickup & Dropoff
  const [pickupCity, setPickupCity] = useState("");
  const [pickupPoint, setPickupPoint] = useState<PickupPoint | null>(null);
  const [dropoffCity, setDropoffCity] = useState("");
  const [dropoffPoint, setDropoffPoint] = useState<PickupPoint | null>(null);

  // Booking
  const [selectedTrip, setSelectedTrip] = useState<TripSearchResult | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<SeatStatus | null>(null);
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("VNPAY");
  const [bookedTicket, setBookedTicket] = useState<TicketRecord | null>(null);

  // Loading states
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [trips, setTrips] = useState<TripSearchResult[]>([]);
  const [seats, setSeats] = useState<SeatStatus[]>([]);

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

  // Lắng nghe sự kiện auth expired để hiển thị thông báo
  useEffect(() => {
    const handleAuthExpired = (e: Event) => {
      const customEvent = e as CustomEvent;
      toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      setTimeout(() => { window.location.href = "/auth/login"; }, 2000);
    };

    window.addEventListener("auth:expired", handleAuthExpired);
    return () => window.removeEventListener("auth:expired", handleAuthExpired);
  }, []);

  const canGoToStep = (target: Step) => {
    switch (target) {
      case "search": return true;
      case "pickup": return !!selectedTrip;
      case "dropoff": return !!selectedTrip && !!pickupPoint;
      case "seats": return !!selectedTrip && !!pickupPoint && !!dropoffPoint;
      case "confirm": return !!selectedTrip && !!pickupPoint && !!dropoffPoint && !!selectedSeat;
      case "success": return !!bookedTicket;
      default: return false;
    }
  };

  const handleReset = () => {
    setStep("search");
    setTrips([]);
    setSeats([]);
    setSelectedTrip(null);
    setSelectedSeat(null);
    setPickupCity("");
    setPickupPoint(null);
    setDropoffCity("");
    setDropoffPoint(null);
    setBookedTicket(null);
    setPhone(user?.phone ?? "");
    loadTrips();
  };

  const handleStepClick = (target: Step) => {
    if (!canGoToStep(target)) {
      if (target === "pickup") toast("Hãy chọn một chuyến để mở bước này.");
      return;
    }
    setStep(target);
  };

  const handleSearch = async () => {
    if (origin && destination && origin === destination) {
      toast.error("Điểm đi và điểm đến không được trùng nhau");
      return;
    }
    setLoadingTrips(true);
    try {
      const data = await searchTrips({ origin, destination, date });
      setTrips(data);
    } catch {
      toast.error("Không tìm được chuyến, vui lòng thử lại");
    } finally {
      setLoadingTrips(false);
    }
  };

  const handleSelectTrip = async (trip: TripSearchResult) => {
    setSelectedTrip(trip);
    setSelectedSeat(null);
    setSeats([]);
    setPickupCity("");
    setPickupPoint(null);
    setDropoffCity("");
    setDropoffPoint(null);
    setStep("pickup");
  };

  const handleProceedFromPickup = () => {
    if (!pickupPoint) {
      toast.error("Vui lòng chọn điểm đón cụ thể");
      return;
    }
    setStep("dropoff");
  };

  const handleProceedFromDropoff = async () => {
    if (!dropoffPoint) {
      toast.error("Vui lòng chọn điểm trả cụ thể");
      return;
    }
    setLoadingSeats(true);
    try {
      const data = await getTripSeats(selectedTrip!.id);
      setSeats(data);
      setStep("seats");
    } catch (err: any) {
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
    if (!pickupPoint || !dropoffPoint) {
      toast.error("Vui lòng chọn điểm đón và điểm trả");
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
        pickupPoint: pickupPoint.name + " - " + pickupPoint.address,
        dropoffPoint: dropoffPoint.name + " - " + dropoffPoint.address,
      });
      setBookedTicket(ticket);

      if (paymentMethod === "VNPAY") {
        // Thanh toán online qua VNPay: gọi backend tạo URL rồi redirect
        try {
          const vnpayRes = await createVnpayPayment(ticket.id);
          sessionStorage.setItem("pendingVnpayTicketId", String(ticket.id));
          window.location.href = vnpayRes.paymentUrl;
          return;
        } catch (err: any) {
          const status = err?.response?.status;
          const backendMsg = err?.response?.data?.message ?? err?.message ?? "";

          // Nếu VNPay URL creation thất bại, vé vẫn tồn tại ở trạng thái HOLD.
          // User có thể retry từ trang "Vé của tôi" — không cần hủy.
          let displayMsg = `Không tạo được URL thanh toán VNPay.`;
          if (status === 401) {
            displayMsg = "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.";
            setTimeout(() => { window.location.href = "/auth/login"; }, 2000);
          } else if (status === 403) {
            displayMsg = backendMsg || "Bạn không có quyền thanh toán vé này.";
          } else if (backendMsg) {
            displayMsg = `Lỗi: ${backendMsg}`;
          }
          toast.error(displayMsg + " Bạn có thể thử thanh toán lại từ trang 'Vé của tôi'.");
        }
      }

      // COD: chỉ đặt vé, nhân viên gọi xác nhận và thu tiền sau
      setStep("success");
      toast.success("Đặt vé thành công! Nhân viên sẽ gọi xác nhận trước khi khởi hành.");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Đặt vé thất bại, vui lòng thử lại";
      toast.error(msg);
    } finally {
      setConfirming(false);
    }
  };

  // Get cities for pickup/dropoff. Hiện vẫn cho phép chọn toàn bộ địa điểm,
  // nhưng không còn nhấn mạnh "khớp tuyến có sẵn" để tránh gây rối UX.
  const tripAvailableCities = useMemo(() => LOCATIONS, []);

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="space-y-5">
      {/* ── Step indicator ── */}
      <div className="flex items-center gap-1 text-sm overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const isActive = s === step;
          const isDone = i < stepIndex;
          const isEnabled = canGoToStep(s);
          return (
            <div key={s} className="flex items-center gap-1 shrink-0">
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
                className={`whitespace-nowrap text-xs ${
                  isActive ? "font-semibold text-pink-700" : "text-pink-300"
                } ${isEnabled ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                {STEP_LABELS[s]}
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-pink-300 mx-0.5" />
              )}
            </div>
          );
        })}
      </div>

      {step !== "success" && step !== "search" && (
        <p className="text-xs text-pink-500">
          {step === "pickup" && "Sau khi chọn điểm đón, bạn sẽ tiếp tục chọn điểm trả."}
          {step === "dropoff" && "Sau khi chọn điểm trả, hệ thống sẽ tải sơ đồ ghế."}
        </p>
      )}

      {/* ══════════════════════════════════════════
          STEP 1: TÌM CHUYẾN
      ══════════════════════════════════════════ */}
      {step === "search" && (
        <BookingHero>
          <div className="booking-hero-search-card">
            <h2 className="booking-hero-search-title">Tìm chuyến xe</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block text-sm font-semibold text-pink-900">
                Điểm đi
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="customer-input mt-1.5 w-full px-3 py-2 text-sm font-medium text-slate-800"
                >
                  <option value="">-- Tất cả --</option>
                  {LOCATIONS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-pink-900">
                Điểm đến
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="customer-input mt-1.5 w-full px-3 py-2 text-sm font-medium text-slate-800"
                >
                  <option value="">-- Tất cả --</option>
                  {LOCATIONS.filter((l) => l !== origin).map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-pink-900">
                Ngày đi
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDate(e.target.value)}
                  className="customer-input mt-1.5 w-full px-3 py-2 text-sm font-medium text-slate-800"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={handleSearch}
                className="customer-btn-primary py-2.5 text-sm font-bold text-white px-7 shadow-lg shadow-pink-500/30"
              >
                🔍 Tìm kiếm
              </button>
              <button
                onClick={() => {
                  setOrigin("");
                  setDestination("");
                  loadTrips();
                }}
                className="rounded-xl border-2 border-pink-300 bg-white/70 backdrop-blur-sm px-5 py-2.5 text-sm font-semibold text-pink-800 hover:bg-white hover:border-pink-500 transition-all"
              >
                Xem tất cả
              </button>
            </div>
          </div>

          {/* Danh sách chuyến - bên trong hero bottom */}
          <div className="mt-4 space-y-2">
          {loadingTrips ? (
            <div className="rounded-2xl bg-white/85 backdrop-blur-md p-12 text-center shadow-md border border-pink-100">
              <div className="animate-spin h-8 w-8 border-2 border-pink-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-pink-700 font-semibold">Đang tải danh sách chuyến...</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="rounded-2xl bg-white/85 backdrop-blur-md p-10 text-center shadow-md border border-pink-100">
              <div className="text-4xl mb-3">🚌</div>
              <p className="text-pink-700 font-bold mb-1">Không có chuyến nào trong khoảng thời gian này.</p>
              <p className="text-sm text-pink-500">Hãy thử chọn ngày khác.</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-bold text-pink-900">
                {trips.length} chuyến khả dụng
              </p>
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex items-center justify-between rounded-2xl bg-white/90 backdrop-blur-md p-4 shadow-md hover:shadow-lg hover:bg-white transition cursor-pointer border border-pink-100"
                  onClick={() => handleSelectTrip(trip)}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-base font-semibold text-pink-900">
                      <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded-lg text-sm font-bold">
                        {trip.origin}
                      </span>
                      <span className="text-pink-400">→</span>
                      <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded-lg text-sm font-bold">
                        {trip.destination}
                      </span>
                    </div>
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
            </>
          )}
          </div>
        </BookingHero>
      )}

      {/* ══════════════════════════════════════════
          STEP 2: CHỌN ĐIỂM ĐÓN
      ══════════════════════════════════════════ */}
      {step === "pickup" && selectedTrip && (
        <div className="space-y-4">
          {/* Trip summary header */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-white border border-emerald-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-emerald-600 font-medium mb-1">Chuyến đã chọn</div>
                <div className="flex items-center gap-2 text-base font-bold text-pink-900">
                  <span className="bg-pink-100 px-2 py-0.5 rounded-lg text-sm">{selectedTrip.origin}</span>
                  <span className="text-pink-400">→</span>
                  <span className="bg-pink-100 px-2 py-0.5 rounded-lg text-sm">{selectedTrip.destination}</span>
                </div>
                <div className="mt-1 text-sm text-pink-500">
                  {fmtDate(selectedTrip.departureTime)} · {fmtTime(selectedTrip.departureTime)} · {selectedTrip.busLabel}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-pink-500">Giá vé</div>
                <div className="text-lg font-bold text-pink-600">{fmtPrice(selectedTrip.basePrice)}</div>
              </div>
            </div>
          </div>

          {/* Pickup selector */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-pink-900 mb-4">
              Chọn điểm đón khách
            </h2>
            <PointSelector
              label="Điểm đón"
              sublabel="Chọn thành phố nếu cần, sau đó chọn trực tiếp điểm đón bên dưới"
              icon="pickup"
              selectedCity={pickupCity}
              selectedPoint={pickupPoint}
              availableCities={tripAvailableCities}
              onCityChange={setPickupCity}
              onPointChange={setPickupPoint}
            />
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => setStep("search")}
              className="rounded-xl border border-pink-200 px-5 py-2.5 text-sm font-semibold text-pink-600 hover:bg-pink-50"
            >
              ← Quay lại
            </button>
            <button
              onClick={handleProceedFromPickup}
              disabled={!pickupPoint}
              className="rounded-xl bg-pink-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-pink-700 transition"
            >
              Tiếp tục chọn điểm trả →
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 3: CHỌN ĐIỂM TRẢ
      ══════════════════════════════════════════ */}
      {step === "dropoff" && selectedTrip && pickupPoint && (
        <div className="space-y-4">
          {/* Trip summary */}
          <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-white border border-amber-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-amber-600 font-medium mb-1">Chuyến đã chọn</div>
                <div className="flex items-center gap-2 text-base font-bold text-pink-900">
                  <span className="bg-pink-100 px-2 py-0.5 rounded-lg text-sm">{selectedTrip.origin}</span>
                  <span className="text-pink-400">→</span>
                  <span className="bg-pink-100 px-2 py-0.5 rounded-lg text-sm">{selectedTrip.destination}</span>
                </div>
                <div className="mt-1 text-sm text-pink-500">
                  {fmtDate(selectedTrip.departureTime)} · {fmtTime(selectedTrip.departureTime)} · {selectedTrip.busLabel}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-pink-500">Giá vé</div>
                <div className="text-lg font-bold text-pink-600">{fmtPrice(selectedTrip.basePrice)}</div>
              </div>
            </div>

            {/* Pickup confirmation */}
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <MapPin className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
              <div>
                <div className="text-xs text-emerald-600 font-semibold">Điểm đón đã chọn</div>
                <div className="text-sm font-semibold text-emerald-700">{pickupPoint.name}</div>
                <div className="text-xs text-emerald-600">{pickupPoint.address}</div>
              </div>
            </div>
          </div>

          {/* Dropoff selector */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-pink-900 mb-4">
              Chọn điểm trả khách
            </h2>
            <PointSelector
              label="Điểm trả"
              sublabel="Chọn điểm trả cụ thể ở thành phố đến của tuyến"
              icon="dropoff"
              selectedCity={dropoffCity}
              selectedPoint={dropoffPoint}
              availableCities={tripAvailableCities}
              lockedCity={!!selectedTrip}
              onCityChange={setDropoffCity}
              onPointChange={setDropoffPoint}
            />
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => setStep("pickup")}
              className="rounded-xl border border-pink-200 px-5 py-2.5 text-sm font-semibold text-pink-600 hover:bg-pink-50"
            >
              ← Quay lại
            </button>
            <button
              onClick={handleProceedFromDropoff}
              disabled={!dropoffPoint || loadingSeats}
              className="rounded-xl bg-pink-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-pink-700 transition"
            >
              {loadingSeats ? "Đang tải ghế..." : "Tiếp tục chọn ghế →"}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 4: CHỌN GHẾ
      ══════════════════════════════════════════ */}
      {step === "seats" && selectedTrip && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
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
              onClick={() => setStep("dropoff")}
              className="text-sm text-pink-400 hover:text-pink-600"
            >
              ← Quay lại
            </button>
          </div>

          {/* Pickup/dropoff summary bar */}
          {pickupPoint && dropoffPoint && (
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs text-emerald-700">
                <MapPin className="h-3 w-3" />
                <span className="font-medium">Đón:</span>
                <span>{pickupPoint.name}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs text-amber-700">
                <MapPin className="h-3 w-3" />
                <span className="font-medium">Trả:</span>
                <span>{dropoffPoint.name}</span>
              </div>
            </div>
          )}

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
              className="rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-pink-700 transition"
            >
              {selectedSeat ? "Tiếp tục xác nhận" : "Chọn ghế để tiếp tục"}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 5: XÁC NHẬN & THANH TOÁN COD
      ══════════════════════════════════════════ */}
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

          {/* Trip summary */}
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

          {/* Pickup & Dropoff summary */}
          {pickupPoint && dropoffPoint && (
            <div className="mb-4 space-y-2">
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <MapPin className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-emerald-600">Điểm đón</div>
                  <div className="text-sm font-semibold text-emerald-700">{pickupPoint.name}</div>
                  <div className="text-xs text-emerald-600">{pickupPoint.address}</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <MapPin className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-amber-600">Điểm trả</div>
                  <div className="text-sm font-semibold text-amber-700">{dropoffPoint.name}</div>
                  <div className="text-xs text-amber-600">{dropoffPoint.address}</div>
                </div>
              </div>
            </div>
          )}

          {/* Phương thức thanh toán */}
          <div className="mb-5">
            <h3 className="mb-2.5 text-sm font-semibold text-pink-900">
              Phương thức thanh toán
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <PaymentMethodCard
                value="VNPAY"
                selected={paymentMethod === "VNPAY"}
                onClick={() => setPaymentMethod("VNPAY")}
                icon={<CreditCard className="h-5 w-5" />}
                title="Thanh toán online (VNPay)"
                desc="Thẻ ATM nội địa, Visa/Master, QR ngân hàng"
                badge="Khuyên dùng"
                badgeColor="bg-pink-100 text-pink-700"
              />
              <PaymentMethodCard
                value="COD"
                selected={paymentMethod === "COD"}
                onClick={() => setPaymentMethod("COD")}
                icon={<Smartphone className="h-5 w-5" />}
                title="Thanh toán khi lên xe"
                desc="Tiền mặt cho nhân viên khi lên xe"
              />
            </div>

            {paymentMethod === "VNPAY" && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
                <CreditCard className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  Sau khi xác nhận, bạn sẽ được chuyển sang cổng thanh toán VNPay
                  để hoàn tất thanh toán. Vé chỉ được giữ chỗ trong{" "}
                  <strong>15 phút</strong>.
                </div>
              </div>
            )}
          </div>

          {/* Phone */}
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
              {paymentMethod === "COD"
                ? "Nhân viên sẽ gọi xác nhận chỗ ngồi và hướng dẫn thanh toán khi bạn lên xe."
                : "Nhân viên sẽ liên hệ xác nhận sau khi bạn thanh toán thành công."}
            </p>
          </div>

          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full rounded-xl bg-pink-600 py-3 text-sm font-semibold text-white disabled:opacity-60 hover:bg-pink-700 transition"
          >
            {confirming
              ? "Đang xử lý..."
              : paymentMethod === "VNPAY"
                ? "Tiến hành thanh toán qua VNPay →"
                : "Xác nhận đặt vé (COD)"}
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 6: THÀNH CÔNG
      ══════════════════════════════════════════ */}
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

            {/* Pickup & Dropoff in ticket */}
            {pickupPoint && (
              <div className="flex justify-between border-t border-blue-200 pt-2 mt-1">
                <span className="text-pink-500">Điểm đón</span>
                <span className="text-right font-medium text-emerald-700 text-xs">
                  {pickupPoint.name}<br />{pickupPoint.address}
                </span>
              </div>
            )}
            {dropoffPoint && (
              <div className="flex justify-between">
                <span className="text-pink-500">Điểm trả</span>
                <span className="text-right font-medium text-amber-700 text-xs">
                  {dropoffPoint.name}<br />{dropoffPoint.address}
                </span>
              </div>
            )}

            <div className="flex justify-between border-t border-blue-200 pt-2 mt-1">
              <span className="font-semibold text-blue-700">Thanh toán</span>
              <span className="font-bold text-blue-600 text-base">
                {paymentMethod === "VNPAY" ? "VNPay (Online)" : "COD - Khi lên xe"}
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
              className="rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-pink-700"
            >
              Đặt vé khác
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
