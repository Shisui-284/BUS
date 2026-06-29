// ============================================================================
// MAIN LAYOUT — Layout chính (sidebar + header + outlet)
// Sidebar render khác nhau cho CUSTOMER (hồng) và ADMIN (xanh tím)
// ============================================================================

import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { LogOut, LayoutDashboard } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { ROLE_LABELS } from "../../utils/constants";
import Snowfall from "../../components/ui/Snowfall";
import AdminDashboardPage from "../../pages/admin/AdminDashboardPage";
import AdminUsersPage from "../../pages/admin/AdminUsersPage";
import AdminBusesPage from "../../pages/admin/AdminBusesPage";
import AdminTripsPage from "../../pages/admin/AdminTripsPage";
import AdminTicketsPage from "../../pages/admin/AdminTicketsPage";
import AdminAssignmentsPage from "../../pages/admin/AdminAssignmentsPage";
import AdminRevenuePage from "../../pages/admin/AdminRevenuePage";

import CustomerBookingPage from "../../pages/customer/CustomerBookingPage";
import CustomerTicketsPage from "../../pages/customer/CustomerTicketsPage";
import CustomerProfilePage from "../../pages/customer/CustomerProfilePage";

const menuConfig = {
  ADMIN: [
    { label: "Dashboard", to: "/admin/dashboard", icon: "📊" },
    { label: "Thống kê doanh thu", to: "/admin/revenue", icon: "💰" },
    { label: "Quản lý tài khoản", to: "/admin/users", icon: "👥" },
    { label: "Quản lý nhân sự", to: "/admin/assignments", icon: "👔" },
    { label: "Quản lý xe", to: "/admin/buses", icon: "🚌" },
    { label: "Quản lý chuyến & tuyến", to: "/admin/trips", icon: "🗺️" },
    { label: "Quản lý vé", to: "/admin/tickets", icon: "🎫" },
  ],
  CUSTOMER: [
    { label: "Đặt vé", to: "/customer/booking", icon: "🎟️" },
    { label: "Vé của tôi", to: "/customer/tickets", icon: "📋" },
    { label: "Hồ sơ", to: "/customer/profile", icon: "👤" },
  ],
};

type RoleKey = keyof typeof menuConfig;

function MainLayout() {
  const { user, logout } = useAuthStore();
  const role = (user?.role ?? "CUSTOMER") as RoleKey;
  const items = menuConfig[role] ?? menuConfig.CUSTOMER;
  const isCustomer = role === "CUSTOMER";

  return (
    <div className={`min-h-screen ${isCustomer ? "customer-layout" : ""}`}>
      <div className="flex min-h-screen">
          {/* Dark Sidebar */}
        <aside className="w-64 flex-shrink-0">
          <div className="fixed inset-y-0 left-0 w-64">
            {/* Sidebar Background */}
            <div className={`absolute inset-0 ${isCustomer ? "bg-gradient-to-b from-pink-800 via-pink-900 to-pink-800" : "bg-gradient-to-b from-[#2a2a2e] via-[#323238] to-[#2a2a2e]"}`} />

            {/* Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className={`absolute -left-20 -top-20 h-40 w-40 rounded-full ${isCustomer ? "bg-pink-400/10" : "bg-blue-500/5"} blur-3xl`} />
              <div className={`absolute -bottom-20 -right-20 h-40 w-40 rounded-full ${isCustomer ? "bg-orange-400/10" : "bg-purple-500/5"} blur-3xl`} />
            </div>

            {/* Sidebar Content */}
            <div className="relative flex h-full flex-col">
              {/* Logo Section */}
              <div className="px-6 py-8">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ${isCustomer ? "bg-gradient-to-br from-pink-500 to-rose-600 shadow-pink-500/30" : "bg-gradient-to-br from-blue-500 to-purple-600 shadow-blue-500/20"}`}>
                    <LayoutDashboard className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">XeKhách Pro</div>
                    <p className={`text-xs ${isCustomer ? "text-pink-300" : "text-slate-500"}`}>
                      {isCustomer ? "Đặt vé trực tuyến" : "Quản lý chuyến xe"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-4 pb-4">
                <div className="mb-4 px-3">
                  <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isCustomer ? "text-pink-400" : "text-slate-600"}`}>
                    Menu chính
                  </span>
                </div>
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `group relative mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? `${isCustomer ? "bg-pink-500/20 text-white border border-pink-400/30 shadow-lg shadow-pink-500/10" : "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30 shadow-lg shadow-blue-500/10"}`
                          : `${isCustomer ? "text-pink-200 hover:bg-white/10 hover:text-white border border-transparent" : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"}`
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active Indicator */}
                        {isActive && (
                          <div className={`absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full ${isCustomer ? "bg-gradient-to-b from-pink-400 to-rose-500" : "bg-gradient-to-b from-blue-500 to-purple-500"}`} />
                        )}
                        <span className="text-lg">{item.icon}</span>
                        <span>{item.label}</span>
                        {isActive && (
                          <div className="ml-auto">
                            <div className={`h-2 w-2 rounded-full ${isCustomer ? "bg-pink-400" : "bg-blue-400"}`} />
                          </div>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>

              {/* User Info */}
              <div className="border-t border-white/5 px-6 py-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isCustomer ? "bg-gradient-to-br from-rose-400 to-pink-500" : "bg-gradient-to-br from-amber-500 to-orange-600"} text-lg font-bold text-white`}>
                    {user?.fullName?.charAt(0) || "U"}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-semibold text-white">
                      {user?.fullName || "Người dùng"}
                    </p>
                    <p className={`text-xs ${isCustomer ? "text-pink-300" : "text-slate-500"}`}>
                      {ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role}
                    </p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className={`flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${isCustomer ? "bg-red-500/20 text-red-300 hover:bg-red-500/30 hover:text-red-200" : "bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"}`}
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <header className={`sticky top-0 z-40 flex h-16 items-center justify-between border-b px-6 backdrop-blur-xl ${
            isCustomer
              ? "bg-white/60 border-pink-100 text-pink-900"
              : "border-white/10 bg-[#1a1a2e]/80 text-white"
          }`}>
            <div className="flex items-center gap-4">
              <div>
                <h1 className={`text-lg font-semibold ${isCustomer ? "text-pink-900" : "text-white"}`}>
                  {isCustomer ? "Đặt vé xe khách" : "Bảng điều khiển"}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Current Date */}
              <div className={`hidden items-center gap-2 rounded-xl px-4 py-2 text-sm lg:flex ${
                isCustomer ? "bg-pink-50 text-pink-600" : "bg-white/5 text-slate-400"
              }`}>
                <span className={`h-2 w-2 animate-pulse rounded-full ${isCustomer ? "bg-pink-500" : "bg-emerald-400"}`} />
                <span>
                  {new Date().toLocaleDateString("vi-VN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <Routes>
              {/* ADMIN ROUTES */}
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/revenue" element={<AdminRevenuePage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/assignments" element={<AdminAssignmentsPage />} />
              <Route path="/admin/buses" element={<AdminBusesPage />} />
              <Route path="/admin/trips" element={<AdminTripsPage />} />
              <Route path="/admin/tickets" element={<AdminTicketsPage />} />
              <Route path="/admin/routes" element={<Navigate to="/admin/trips" replace />} />

              {/* CUSTOMER ROUTES */}
              <Route path="/customer/booking" element={<CustomerBookingPage />} />
              <Route path="/customer/tickets" element={<CustomerTicketsPage />} />
              <Route path="/customer/profile" element={<CustomerProfilePage />} />

              <Route path="*" element={<NavigateToDefault role={role} />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

function NavigateToDefault({ role }: { role: RoleKey }) {
  const defaultPath = menuConfig[role]?.[0]?.to ?? "/customer/booking";
  return <Navigate to={defaultPath} replace />;
}

export default MainLayout;
