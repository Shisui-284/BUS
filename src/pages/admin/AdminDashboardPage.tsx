import { useEffect, useState } from "react";
import { Users, Bus, Route, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { getAdminDashboard, AdminDashboardData } from "../../api/admin";
import { extractApiErrorMessage } from "../../utils/apiError";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị",
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
      .catch((error) => {
        const backendMessage = extractApiErrorMessage(error);
        toast.error(backendMessage || "Không thể tải dữ liệu dashboard");
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="admin-panel flex h-64 items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
      </div>
    );
  }

  if (!data) return null;

  const totalAlerts = data.insuranceAlerts.length;
  const expiredCount = data.insuranceAlerts.filter((alert) => alert.alertType === "EXPIRED").length;
  const expiringCount = data.insuranceAlerts.filter((alert) => alert.alertType === "EXPIRING_SOON").length;

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
              System Overview
            </p>
            <h1 className="admin-title text-3xl">Dashboard Quản trị</h1>
            <p className="admin-subtitle mt-2 text-sm">
              Tổng quan hệ thống XeKhách Pro —{" "}
              {new Date().toLocaleDateString("vi-VN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Cảnh báo bảo hiểm
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalAlerts}</p>
          </div>
        </div>
      </section>

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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="admin-card p-6 transition">
          <div className="mb-5">
            <h2 className="admin-title text-lg">Phân bổ người dùng theo vai trò</h2>
            <p className="admin-subtitle mt-1 text-sm">
              Thống kê số lượng tài khoản theo từng nhóm quyền.
            </p>
          </div>

          <div className="space-y-4">
            {data.roleDistribution.length === 0 ? (
              <EmptyText />
            ) : (
              data.roleDistribution.map((roleItem) => {
                const pct = data.totalUsers > 0
                  ? Math.round((roleItem.count / data.totalUsers) * 100)
                  : 0;

                const color =
                  roleItem.role === "ADMIN"
                    ? "bg-red-500"
                    : "bg-emerald-500";

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

        <section className="admin-card p-6 transition">
          <div className="mb-5">
            <h2 className="admin-title text-lg">Trạng thái đội xe</h2>
            <p className="admin-subtitle mt-1 text-sm">
              Theo dõi tình trạng khai thác hiện tại của phương tiện.
            </p>
          </div>

          <div className="space-y-4">
            {data.busStatusDistribution.length === 0 ? (
              <EmptyText />
            ) : (
              data.busStatusDistribution.map((busItem) => {
                const pct = data.totalBuses > 0
                  ? Math.round((busItem.count / data.totalBuses) * 100)
                  : 0;

                const color =
                  busItem.status === "AVAILABLE"
                    ? "bg-emerald-500"
                    : busItem.status === "RUNNING"
                      ? "bg-blue-500"
                      : "bg-amber-500";

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

      <section className="admin-panel overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="admin-title text-lg">Cảnh báo bảo hiểm xe</h2>
            <p className="admin-subtitle mt-1 text-sm">
              Danh sách xe đã hết hạn hoặc sắp hết hạn bảo hiểm.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            {totalAlerts === 0 ? (
              <span className="badge badge-success">Tất cả xe đều an toàn</span>
            ) : (
              <>
                {expiredCount > 0 && (
                  <span className="badge badge-danger">{expiredCount} xe hết hạn</span>
                )}

                {expiringCount > 0 && (
                  <span className="badge badge-warning">{expiringCount} xe sắp hết hạn</span>
                )}
              </>
            )}
          </div>
        </div>

        {data.insuranceAlerts.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-slate-500">
              Không có xe nào hết hạn hoặc sắp hết hạn bảo hiểm.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead>
                <tr>
                  <th className="px-5 py-4">Biển số</th>
                  <th className="px-5 py-4">Loại xe</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4">Ngày hết hạn</th>
                  <th className="px-5 py-4">Cảnh báo</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {data.insuranceAlerts.map((alert) => (
                  <tr key={alert.busId}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{alert.licensePlate}</p>
                    </td>

                    <td className="px-5 py-4 text-slate-600">{alert.busType}</td>

                    <td className="px-5 py-4">
                      <span className="badge bg-slate-100 text-slate-600">
                        {BUS_STATUS_LABELS[alert.status] ?? alert.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {new Date(alert.expiryDate).toLocaleDateString("vi-VN")}
                    </td>

                    <td className="px-5 py-4">
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
    <div className="admin-card p-5 transition">
      <div className="flex items-center gap-4">
        <div className={`rounded-2xl p-3 ${bg}`}>{icon}</div>

        <div>
          <p className="text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
          <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
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
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-medium text-slate-500">{value}</span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function EmptyText() {
  return <p className="text-sm text-slate-500">Không có dữ liệu</p>;
}