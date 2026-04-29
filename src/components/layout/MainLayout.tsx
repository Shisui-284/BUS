import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { ROLE_LABELS } from "../../utils/constants";
import AdminDashboardPage from "../../pages/admin/AdminDashboardPage";
import AdminUsersPage from "../../pages/admin/AdminUsersPage";
import AdminBusesPage from "../../pages/admin/AdminBusesPage";
import AdminRoutesPage from "../../pages/admin/AdminRoutesPage";
import DispatcherDashboardPage from "../../pages/dispatcher/DispatcherDashboardPage";
import CustomerBookingPage from "../../pages/customer/CustomerBookingPage";
import CustomerTicketsPage from "../../pages/customer/CustomerTicketsPage";
import CustomerProfilePage from "../../pages/customer/CustomerProfilePage";

const menuConfig = {
  ADMIN: [
    { label: "Dashboard", to: "/admin/dashboard" },
    { label: "Quản lý tài khoản", to: "/admin/users" },
    { label: "Quản lý xe", to: "/admin/buses" },
    { label: "Quản lý tuyến", to: "/admin/routes" },
  ],
  STAFF: [{ label: "Dashboard", to: "/staff/dashboard" }],
  CUSTOMER: [
    { label: "Đặt vé", to: "/customer/booking" },
    { label: "Vé của tôi", to: "/customer/tickets" },
    { label: "Hồ sơ", to: "/customer/profile" },
  ],
};

type RoleKey = keyof typeof menuConfig;

function MainLayout() {
  const { user, logout } = useAuthStore();
  const role = (user?.role ?? "CUSTOMER") as RoleKey;
  const items = menuConfig[role] ?? menuConfig.CUSTOMER;

  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      <div className="flex min-h-screen">
        <aside className="w-60 bg-[#0F2849] text-white shadow-md">
          <div className="px-6 py-8">
            <div className="text-2xl font-semibold">XeKhách Pro</div>
            <p className="mt-2 text-sm text-slate-300">
              Quản lý chuyến xe liên tỉnh
            </p>
          </div>
          <nav className="px-4">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-amber-500 text-slate-950"
                      : "text-slate-200 hover:bg-white/10"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-8 px-6 text-xs text-slate-400">
            Vai trò: {ROLE_LABELS[role as keyof typeof ROLE_LABELS]}
          </div>
        </aside>

        <div className="flex-1">
          <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
            <div className="text-lg font-semibold text-slate-900">
              Bảng điều khiển
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-700">
                {user?.fullName || "Người dùng"}
              </span>
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </div>
          </header>

          <main className="p-6">
            <Routes>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/buses" element={<AdminBusesPage />} />
              <Route path="/admin/routes" element={<AdminRoutesPage />} />
              <Route
                path="/staff/dashboard"
                element={<DispatcherDashboardPage />}
              />
              <Route
                path="/customer/booking"
                element={<CustomerBookingPage />}
              />
              <Route
                path="/customer/tickets"
                element={<CustomerTicketsPage />}
              />
              <Route
                path="/customer/profile"
                element={<CustomerProfilePage />}
              />
              <Route path="*" element={<NavigateToDefault role={role} />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

function NavigateToDefault({ role }: { role: RoleKey }) {
  const defaultPath = menuConfig[role]?.[0]?.to ?? "/staff/dashboard";
  return <Navigate to={defaultPath} replace />;
}

export default MainLayout;
