import { useEffect, useState } from "react";
import { Users, Bus, Route, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import {
  getAdminDashboard,
  AdminDashboardData,
} from "../../api/admin";
import { extractApiErrorMessage } from "../../utils/apiError";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị",
  STAFF: "Nhân viên",
  CUSTOMER: "Khách hàng",
};

const BUS_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Sẵn sàng",
  RUNNING: "Đang chạy",
  MAINTENANCE: "Bảo trì",
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAdminDashboard()
      .then(setData)
      .catch(() => toast.error("Không thể tải dữ liệu dashboard"))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (!data) return null;

  const totalAlerts = data.insuranceAlerts.length;
  const expiredCount = data.insuranceAlerts.filter((a) => a.alertType === "EXPIRED").length;
  const expiringCount = data.insuranceAlerts.filter((a) => a.alertType === "EXPIRING_SOON").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard Quản trị</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tổng quan hệ thống XeKhách Pro — {new Date().toLocaleDateString("vi-VN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-6 w-6 text-blue-600" />}
          label="Tổng người dùng"
          value={data.totalUsers}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<Bus className="h-6 w-6 text-emerald-600" />}
          label="Tổng xe"
          value={data.totalBuses}
          bg="bg-emerald-50"
        />
        <StatCard
          icon={<Route className="h-6 w-6 text-purple-600" />}
          label="Tổng tuyến"
          value={data.totalRoutes}
          bg="bg-purple-50"
        />
        <StatCard
          icon={<Calendar className="h-6 w-6 text-amber-600" />}
          label="Chuyến hôm nay"
          value={data.todayTrips}
          bg="bg-amber-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Role Distribution */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Phân bổ người dùng theo vai trò</h2>
          <div className="mt-4 space-y-4">
            {data.roleDistribution.length === 0 ? (
              <p className="text-sm text-slate-500">Không có dữ liệu</p>
            ) : (
              data.roleDistribution.map((r) => {
                const pct = data.totalUsers > 0
                  ? Math.round((r.count / data.totalUsers) * 100)
                  : 0;
                const color =
                  r.role === "ADMIN"
                    ? "bg-red-500"
                    : r.role === "STAFF"
                    ? "bg-blue-500"
                    : "bg-emerald-500";
                return (
                  <div key={r.role}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        {ROLE_LABELS[r.role] ?? r.role}
                      </span>
                      <span className="text-slate-500">
                        {r.count} người ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${color} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Bus Status Distribution */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Trạng thái đội xe</h2>
          <div className="mt-4 space-y-4">
            {data.busStatusDistribution.length === 0 ? (
              <p className="text-sm text-slate-500">Không có dữ liệu</p>
            ) : (
              data.busStatusDistribution.map((b) => {
                const pct = data.totalBuses > 0
                  ? Math.round((b.count / data.totalBuses) * 100)
                  : 0;
                const color =
                  b.status === "AVAILABLE"
                    ? "bg-emerald-500"
                    : b.status === "RUNNING"
                    ? "bg-blue-500"
                    : "bg-amber-500";
                const label = BUS_STATUS_LABELS[b.status] ?? b.status;
                return (
                  <div key={b.status}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{label}</span>
                      <span className="text-slate-500">
                        {b.count} xe ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${color} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Insurance Alerts */}
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Cảnh báo bảo hiểm xe</h2>
          <div className="flex items-center gap-3 text-sm">
            {totalAlerts === 0 ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 font-medium">
                Tất cả xe đều an toàn
              </span>
            ) : (
              <>
                {expiredCount > 0 && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-red-700 font-medium">
                    {expiredCount} xe hết hạn
                  </span>
                )}
                {expiringCount > 0 && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700 font-medium">
                    {expiringCount} xe sắp hết hạn
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {data.insuranceAlerts.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Không có xe nào hết hạn hoặc sắp hết hạn bảo hiểm.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Biển số</th>
                  <th className="px-4 py-3 font-semibold">Loại xe</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Ngày hết hạn</th>
                  <th className="px-4 py-3 font-semibold">Cảnh báo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.insuranceAlerts.map((alert) => (
                  <tr key={alert.busId}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {alert.licensePlate}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{alert.busType}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {BUS_STATUS_LABELS[alert.status] ?? alert.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(alert.expiryDate).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3">
                      {alert.alertType === "EXPIRED" ? (
                        <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          Đã hết hạn
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          Sắp hết hạn
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bg: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-2xl p-3 ${bg}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-sm text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
