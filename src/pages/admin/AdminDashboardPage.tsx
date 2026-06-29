// ============================================================================
// ADMIN DASHBOARD PAGE — Trang tổng quan Admin
// Hiển thị: tổng user, tổng chuyến, tổng vé, doanh thu, biểu đồ
// ============================================================================

import { useEffect, useState } from "react";
import { 
  Users, 
  Bus, 
  Route, 
  Calendar, 
  Settings, 
  Ticket, 
  UserCog, 
  MapPin,
  AlertTriangle,
  Shield,
  ChevronRight,
  Activity
} from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { getAdminDashboard, AdminDashboardData } from "../../api/admin";
import { extractApiErrorMessage } from "../../utils/apiError";
import Snowfall from "../../components/ui/Snowfall";
import AdminRevenueStats from "./AdminRevenueStats";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị",
  CUSTOMER: "Khách hàng",
};

const BUS_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Sẵn sàng",
  RUNNING: "Đang chạy",
  MAINTENANCE: "Bảo trì",
};

interface QuickNavItem {
  label: string;
  description: string;
  icon: React.ReactNode;
  to: string;
  color: string;
  gradient: string;
}

const QUICK_NAV_ITEMS: QuickNavItem[] = [
  {
    label: "Quản lý tài khoản",
    description: "Người dùng & phân quyền",
    icon: <Users className="w-6 h-6" />,
    to: "/admin/users",
    color: "text-blue-400",
    gradient: "from-blue-500/20 to-cyan-500/10",
  },
  {
    label: "Quản lý nhân sự",
    description: "Phân công tài xế & phụ xe",
    icon: <UserCog className="w-6 h-6" />,
    to: "/admin/assignments",
    color: "text-purple-400",
    gradient: "from-purple-500/20 to-pink-500/10",
  },
  {
    label: "Quản lý xe",
    description: "Xe & bảo trì",
    icon: <Bus className="w-6 h-6" />,
    to: "/admin/buses",
    color: "text-emerald-400",
    gradient: "from-emerald-500/20 to-teal-500/10",
  },
  {
    label: "Quản lý chuyến & tuyến",
    description: "Tuyến đường & lịch trình",
    icon: <Route className="w-6 h-6" />,
    to: "/admin/trips",
    color: "text-amber-400",
    gradient: "from-amber-500/20 to-orange-500/10",
  },
  {
    label: "Quản lý vé",
    description: "Vé & thanh toán",
    icon: <Ticket className="w-6 h-6" />,
    to: "/admin/tickets",
    color: "text-rose-400",
    gradient: "from-rose-500/20 to-pink-500/10",
  },
];

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bgGradient: string;
  delay: number;
}

function StatCard({ icon, label, value, color, bgGradient, delay }: StatCardProps) {
  return (
    <div 
      className="stat-card group animate-fade-in-up card-hover"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`} />
      <div className="relative z-10 flex items-center gap-4">
        <div className={`${color} p-3 rounded-xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <div>
          <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
          <p className="mt-1 text-sm text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ProgressItem({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="animate-fade-in-up" style={{ animationDelay: "400ms" }}>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-300">{label}</span>
        <span className="font-medium text-slate-500">{value}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full ${color} transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function EmptyText() {
  return <p className="text-sm text-slate-500">Không có dữ liệu</p>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAdminDashboard()
      .then(setData)
      .catch((error) => {
        const backendMessage = extractApiErrorMessage(error);
        toast.error(backendMessage || "Không thể tải dữ liệu dashboard");
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500" />
          <div className="absolute inset-0 h-16 w-16 animate-ping rounded-full border-4 border-blue-500/20" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalAlerts = data.insuranceAlerts.length;
  const expiredCount = data.insuranceAlerts.filter((alert) => alert.alertType === "EXPIRED").length;
  const expiringCount = data.insuranceAlerts.filter((alert) => alert.alertType === "EXPIRING_SOON").length;

  return (
    <div className="relative min-h-screen">
      <Snowfall count={360} />
      
      <div className="relative z-10 space-y-8">
        {/* Hero Section */}
        <section className="animate-fade-in-up">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  Hệ thống đang hoạt động
                </span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                <span className="bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
                  Dashboard Quản trị
                </span>
              </h1>
              <p className="mt-3 text-base text-slate-400">
                XeKhách Pro —{" "}
                <span className="text-slate-300">
                  {new Date().toLocaleDateString("vi-VN", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </p>
            </div>

            {/* Alert Badge */}
            {totalAlerts > 0 && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <AlertTriangle className="h-8 w-8 text-amber-400" />
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-black">
                      {totalAlerts}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-400">
                      Cảnh báo bảo hiểm
                    </p>
                    <p className="mt-1 text-2xl font-bold text-white">{totalAlerts} xe</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Users className="h-6 w-6 text-blue-400" />}
            label="Tổng người dùng"
            value={data.totalUsers}
            color="text-blue-400"
            bgGradient="from-blue-500/10 to-cyan-500/5"
            delay={100}
          />

          <StatCard
            icon={<Bus className="h-6 w-6 text-emerald-400" />}
            label="Tổng xe"
            value={data.totalBuses}
            color="text-emerald-400"
            bgGradient="from-emerald-500/10 to-teal-500/5"
            delay={200}
          />

          <StatCard
            icon={<Route className="h-6 w-6 text-purple-400" />}
            label="Tổng tuyến"
            value={data.totalRoutes}
            color="text-purple-400"
            bgGradient="from-purple-500/10 to-pink-500/5"
            delay={300}
          />

          <StatCard
            icon={<Calendar className="h-6 w-6 text-amber-400" />}
            label="Chuyến hôm nay"
            value={data.todayTrips}
            color="text-amber-400"
            bgGradient="from-amber-500/10 to-orange-500/5"
            delay={400}
          />
        </div>

        {/* Quick Navigation */}
        <section className="animate-fade-in-up" style={{ animationDelay: "500ms" }}>
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white">Điều hướng nhanh</h2>
            <p className="mt-1 text-sm text-slate-500">
              Truy cập nhanh các mục quản lý
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {QUICK_NAV_ITEMS.map((item, index) => (
              <Link
                key={item.to}
                to={item.to}
                className="nav-quick-btn group animate-fade-in-up"
                style={{ animationDelay: `${600 + index * 100}ms` }}
              >
                <div className={`${item.color} mb-3`}>
                  {item.icon}
                </div>
                <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                  {item.label}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {item.description}
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs text-slate-500 group-hover:text-blue-400 transition-colors">
                  <span>Xem ngay</span>
                  <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="admin-panel p-6 animate-fade-in-up" style={{ animationDelay: "700ms" }}>
            <div className="mb-5">
              <h2 className="text-lg font-bold text-white">Phân bổ người dùng theo vai trò</h2>
              <p className="admin-subtitle mt-1 text-sm">
                Thống kê số lượng tài khoản theo từng nhóm quyền.
              </p>
            </div>

            <div className="space-y-5">
              {data.roleDistribution.length === 0 ? (
                <EmptyText />
              ) : (
                data.roleDistribution.map((roleItem) => {
                  const pct = data.totalUsers > 0
                    ? Math.round((roleItem.count / data.totalUsers) * 100)
                    : 0;

                  const color =
                    roleItem.role === "ADMIN"
                      ? "bg-gradient-to-r from-red-500 to-rose-500"
                      : "bg-gradient-to-r from-emerald-500 to-teal-500";

                  return (
                    <ProgressItem
                      key={roleItem.role}
                      label={ROLE_LABELS[roleItem.role] ?? roleItem.role}
                      value={`${roleItem.count} người (${pct}%)`}
                      pct={pct}
                      color={color}
                    />
                  );
                })
              )}
            </div>
          </section>

          <section className="admin-panel p-6 animate-fade-in-up" style={{ animationDelay: "800ms" }}>
            <div className="mb-5">
              <h2 className="text-lg font-bold text-white">Trạng thái đội xe</h2>
              <p className="admin-subtitle mt-1 text-sm">
                Theo dõi tình trạng khai thác hiện tại của phương tiện.
              </p>
            </div>

            <div className="space-y-5">
              {data.busStatusDistribution.length === 0 ? (
                <EmptyText />
              ) : (
                data.busStatusDistribution.map((busItem) => {
                  const pct = data.totalBuses > 0
                    ? Math.round((busItem.count / data.totalBuses) * 100)
                    : 0;

                  const color =
                    busItem.status === "AVAILABLE"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                      : busItem.status === "RUNNING"
                        ? "bg-gradient-to-r from-blue-500 to-cyan-500"
                        : "bg-gradient-to-r from-amber-500 to-orange-500";

                  return (
                    <ProgressItem
                      key={busItem.status}
                      label={BUS_STATUS_LABELS[busItem.status] ?? busItem.status}
                      value={`${busItem.count} xe (${pct}%)`}
                      pct={pct}
                      color={color}
                    />
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Insurance Alerts */}
        <section className="admin-panel overflow-hidden animate-fade-in-up" style={{ animationDelay: "900ms" }}>
          <div className="flex flex-col gap-4 border-b border-white/5 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-500/10 p-2">
                <Shield className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Cảnh báo bảo hiểm xe</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Danh sách xe đã hết hạn hoặc sắp hết hạn bảo hiểm.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              {totalAlerts === 0 ? (
                <span className="badge badge-success">
                  <Shield className="h-3 w-3" />
                  Tất cả xe đều an toàn
                </span>
              ) : (
                <>
                  {expiredCount > 0 && (
                    <span className="badge badge-danger">
                      {expiredCount} xe hết hạn
                    </span>
                  )}

                  {expiringCount > 0 && (
                    <span className="badge badge-warning">
                      {expiringCount} xe sắp hết hạn
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {data.insuranceAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12">
              <div className="rounded-full bg-emerald-500/10 p-4">
                <Shield className="h-12 w-12 text-emerald-400" />
              </div>
              <p className="mt-4 text-lg font-semibold text-white">Tất cả xe đều an toàn</p>
              <p className="mt-1 text-sm text-slate-500">
                Không có xe nào hết hạn hoặc sắp hết hạn bảo hiểm.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table min-w-full divide-y divide-white/5 text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Biển số
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Loại xe
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Trạng thái
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Ngày hết hạn
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Cảnh báo
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {data.insuranceAlerts.map((alert) => (
                    <tr 
                      key={alert.busId}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-white">{alert.licensePlate}</p>
                      </td>

                      <td className="px-6 py-4 text-slate-400">{alert.busType}</td>

                      <td className="px-6 py-4">
                        <span className="badge bg-white/5 text-slate-300 border border-white/10">
                          {BUS_STATUS_LABELS[alert.status] ?? alert.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-400">
                        {new Date(alert.expiryDate).toLocaleDateString("vi-VN")}
                      </td>

                      <td className="px-6 py-4">
                        {alert.alertType === "EXPIRED" ? (
                          <span className="badge badge-danger">Đã hết hạn</span>
                        ) : (
                          <span className="badge badge-warning">Sắp hết hạn</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Revenue Statistics */}
        <AdminRevenueStats />
      </div>
    </div>
  );
}
