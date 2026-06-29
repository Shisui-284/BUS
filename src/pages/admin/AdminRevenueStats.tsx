// ============================================================================
// ADMIN REVENUE STATS — Biểu đồ doanh thu (Admin)
// Thư viện recharts: AreaChart / BarChart / LineChart
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  Wallet,
  CheckCircle2,
  Clock,
  Ban,
  Banknote,
  Calendar,
  CalendarRange,
  CalendarDays,
  BarChart3,
  Loader2,
  Bus,
  UserCog,
  Trophy,
  Award,
  Medal,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  AdminRevenueStats as AdminRevenueStatsType,
  getAdminRevenueStats,
} from "../../api/admin";
import { extractApiErrorMessage } from "../../utils/apiError";

type PeriodKey = "daily" | "weekly" | "monthly" | "yearly";

const PERIODS: Array<{
  key: PeriodKey;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: "daily", label: "Theo tuần (7 ngày)", icon: <Calendar className="h-4 w-4" /> },
  { key: "weekly", label: "Theo tuần (12 tuần)", icon: <CalendarRange className="h-4 w-4" /> },
  { key: "monthly", label: "Theo tháng (12 tháng)", icon: <CalendarDays className="h-4 w-4" /> },
  { key: "yearly", label: "Theo năm (5 năm)", icon: <BarChart3 className="h-4 w-4" /> },
];

const formatVND = (value: number): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return "0 ₫";
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + " tỷ ₫";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + " triệu ₫";
  if (value >= 1_000) return (value / 1_000).toFixed(1) + " nghìn ₫";
  return value.toLocaleString("vi-VN") + " ₫";
};

const formatVNDShort = (value: number): string => {
  if (!value) return "0";
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + "tỷ";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "tr";
  if (value >= 1_000) return (value / 1_000).toFixed(0) + "k";
  return String(value);
};

const formatVNDLong = (value: number): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return "0 ₫";
  return value.toLocaleString("vi-VN") + " ₫";
};

interface ChartPoint {
  label: string;
  doanhThu: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartPoint }>;
  label?: string;
}

function RevenueTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a1a2e]/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="text-lg font-bold text-white">
        {formatVNDLong(payload[0].value)}
      </p>
    </div>
  );
}

export default function AdminRevenueStats() {
  const [data, setData] = useState<AdminRevenueStatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("weekly");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getAdminRevenueStats()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(extractApiErrorMessage(err) || "Không thể tải thống kê doanh thu");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!data) return [];
    switch (period) {
      case "daily":
        return data.dailyRevenue.map((p) => ({ label: p.label, doanhThu: p.amount }));
      case "weekly":
        return data.weeklyRevenue.map((p) => ({ label: p.label, doanhThu: p.amount }));
      case "monthly":
        return data.monthlyRevenue.map((p) => ({ label: p.label, doanhThu: p.amount }));
      case "yearly":
        return data.yearlyRevenue.map((p) => ({ label: p.label, doanhThu: p.amount }));
      default:
        return [];
    }
  }, [data, period]);

  const currentPeriodTotal = useMemo(() => {
    return chartData.reduce((sum, p) => sum + p.doanhThu, 0);
  }, [chartData]);

  if (isLoading) {
    return (
      <section className="admin-panel flex flex-col items-center justify-center p-12 animate-fade-in-up">
        <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
        <p className="mt-3 text-sm text-slate-400">Đang tải thống kê doanh thu...</p>
      </section>
    );
  }

  if (!data) return null;

  const maxRevenue = Math.max(...chartData.map((p) => p.doanhThu), 1);

  return (
    <section className="space-y-6 animate-fade-in-up" style={{ animationDelay: "1000ms" }}>
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 p-2.5 ring-1 ring-emerald-500/30">
            <Wallet className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white">Thống kê doanh thu</h2>
            <p className="mt-1 text-sm text-slate-400">
              Chỉ tính những vé admin đã xác nhận hoặc đã thanh toán thành công.
            </p>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                period === p.key
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {p.icon}
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-5">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-500/20 p-2">
                <Wallet className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">
                Tổng doanh thu
              </p>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-white">
              {formatVND(data.totalRevenue)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Từ {data.confirmedTicketCount.toLocaleString("vi-VN")} vé đã chốt
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent p-5">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-500/20 p-2">
                <CheckCircle2 className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-300/80">
                Đã xác nhận
              </p>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-white">
              {data.confirmedTicketCount.toLocaleString("vi-VN")}
            </p>
            <p className="mt-1 text-xs text-slate-400">Vé tính vào doanh thu</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-5">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-amber-500/20 p-2">
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">
                Chờ xác nhận
              </p>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-white">
              {data.pendingTicketCount.toLocaleString("vi-VN")}
            </p>
            <p className="mt-1 text-xs text-slate-400">Không tính doanh thu</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-transparent p-5">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-rose-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-rose-500/20 p-2">
                <Ban className="h-4 w-4 text-rose-400" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-300/80">
                Đã hủy
              </p>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-white">
              {data.cancelledTicketCount.toLocaleString("vi-VN")}
            </p>
            <p className="mt-1 text-xs text-slate-400">Vé không tính doanh thu</p>
          </div>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="admin-panel p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-white">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Biểu đồ doanh thu
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Doanh thu ra vào theo {PERIODS.find((p) => p.key === period)?.label.toLowerCase()}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
            <Banknote className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-emerald-300/80">Tổng kỳ này:</span>
            <span className="text-sm font-bold text-emerald-300">
              {formatVND(currentPeriodTotal)}
            </span>
          </div>
        </div>

        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="revenueStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="#ffffff10" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatVNDShort(v)}
                width={70}
              />
              <Tooltip content={<RevenueTooltip />} cursor={{ stroke: "#10b981", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area
                type="monotone"
                dataKey="doanhThu"
                name="Doanh thu"
                stroke="url(#revenueStroke)"
                strokeWidth={3}
                fill="url(#revenueGradient)"
                activeDot={{ r: 6, stroke: "#10b981", strokeWidth: 2, fill: "#0f172a" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick period insight */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-xs text-slate-400">Cao nhất</p>
            <p className="mt-1 text-sm font-bold text-emerald-400">
              {formatVND(maxRevenue)}
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-xs text-slate-400">Trung bình / {period === "yearly" ? "năm" : period === "monthly" ? "tháng" : period === "weekly" ? "tuần" : "ngày"}</p>
            <p className="mt-1 text-sm font-bold text-blue-400">
              {formatVND(chartData.length ? Math.round(currentPeriodTotal / chartData.length) : 0)}
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-xs text-slate-400">Số điểm dữ liệu</p>
            <p className="mt-1 text-sm font-bold text-purple-400">
              {chartData.length}
            </p>
          </div>
        </div>
      </div>

      {/* Yearly comparison bar */}
      <div className="admin-panel p-6">
        <div className="mb-5">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <BarChart3 className="h-5 w-5 text-purple-400" />
            So sánh doanh thu theo năm
          </h3>
          <p className="mt-1 text-sm text-slate-400">5 năm gần nhất</p>
        </div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.yearlyRevenue} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatVNDShort(v)}
                width={70}
              />
              <Tooltip content={<RevenueTooltip />} cursor={{ fill: "#ffffff08" }} />
              <Bar dataKey="amount" name="Doanh thu" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top performers */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top buses */}
        <div className="admin-panel p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2">
              <Bus className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Top xe chạy nhiều nhất</h3>
              <p className="mt-1 text-xs text-slate-400">Xếp theo doanh thu</p>
            </div>
          </div>
          {data.topBuses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
              <Bus className="mx-auto h-10 w-10 text-slate-600" />
              <p className="mt-2 text-sm text-slate-500">Chưa có dữ liệu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.topBuses.slice(0, 5).map((bus, index) => {
                const rankColors = [
                  { bg: "from-amber-500/20 to-yellow-500/10", icon: <Trophy className="h-4 w-4" />, text: "text-amber-400" },
                  { bg: "from-slate-400/20 to-slate-300/10", icon: <Award className="h-4 w-4" />, text: "text-slate-300" },
                  { bg: "from-orange-500/20 to-amber-600/10", icon: <Medal className="h-4 w-4" />, text: "text-orange-400" },
                ];
                const style = rankColors[index] ?? { bg: "from-blue-500/20 to-cyan-500/10", icon: <span className="text-xs font-bold">{index + 1}</span>, text: "text-blue-400" };
                return (
                  <div
                    key={bus.busId}
                    className={`relative overflow-hidden rounded-xl border border-white/5 bg-gradient-to-r ${style.bg} p-4 transition-all hover:border-white/10`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ${style.text}`}>
                        {style.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-bold text-white">{bus.licensePlate}</p>
                          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                            {bus.busType}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {bus.tripCount.toLocaleString("vi-VN")} chuyến • {bus.ticketCount.toLocaleString("vi-VN")} vé
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-extrabold text-emerald-400">
                          {formatVND(bus.revenue)}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">doanh thu</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top drivers */}
        <div className="admin-panel p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-purple-500/10 p-2">
              <UserCog className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Top tài xế chạy nhiều nhất</h3>
              <p className="mt-1 text-xs text-slate-400">Xếp theo doanh thu các chuyến được phân công</p>
            </div>
          </div>
          {data.topDrivers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
              <UserCog className="mx-auto h-10 w-10 text-slate-600" />
              <p className="mt-2 text-sm text-slate-500">Chưa có dữ liệu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.topDrivers.slice(0, 5).map((driver, index) => {
                const rankColors = [
                  { bg: "from-amber-500/20 to-yellow-500/10", icon: <Trophy className="h-4 w-4" />, text: "text-amber-400" },
                  { bg: "from-slate-400/20 to-slate-300/10", icon: <Award className="h-4 w-4" />, text: "text-slate-300" },
                  { bg: "from-orange-500/20 to-amber-600/10", icon: <Medal className="h-4 w-4" />, text: "text-orange-400" },
                ];
                const style = rankColors[index] ?? { bg: "from-purple-500/20 to-pink-500/10", icon: <span className="text-xs font-bold">{index + 1}</span>, text: "text-purple-400" };
                return (
                  <div
                    key={driver.employeeId}
                    className={`relative overflow-hidden rounded-xl border border-white/5 bg-gradient-to-r ${style.bg} p-4 transition-all hover:border-white/10`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ${style.text}`}>
                        {style.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-bold text-white">{driver.fullName}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {driver.tripCount.toLocaleString("vi-VN")} chuyến • {driver.ticketCount.toLocaleString("vi-VN")} vé
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-extrabold text-purple-300">
                          {formatVND(driver.revenue)}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">doanh thu</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Monthly line chart */}
      <div className="admin-panel p-6">
        <div className="mb-5">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <TrendingUp className="h-5 w-5 text-cyan-400" />
            Xu hướng doanh thu theo tháng
          </h3>
          <p className="mt-1 text-sm text-slate-400">12 tháng gần nhất</p>
        </div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.monthlyRevenue} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatVNDShort(v)}
                width={70}
              />
              <Tooltip content={<RevenueTooltip />} cursor={{ stroke: "#06b6d4", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Line
                type="monotone"
                dataKey="amount"
                name="Doanh thu"
                stroke="#06b6d4"
                strokeWidth={3}
                dot={{ r: 4, fill: "#06b6d4", strokeWidth: 2, stroke: "#0f172a" }}
                activeDot={{ r: 7, fill: "#06b6d4", strokeWidth: 2, stroke: "#0f172a" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
