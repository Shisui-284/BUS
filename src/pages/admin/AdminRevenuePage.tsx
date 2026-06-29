// ============================================================================
// ADMIN REVENUE PAGE — Thống kê doanh thu (Admin)
// ============================================================================

import Snowfall from "../../components/ui/Snowfall";
import { Wallet, Activity } from "lucide-react";
import AdminRevenueStats from "./AdminRevenueStats";

export default function AdminRevenuePage() {
  return (
    <div className="relative min-h-screen">
      <Snowfall count={280} />

      <div className="relative z-10 space-y-8">
        {/* Hero Section */}
        <section className="animate-fade-in-up">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  Thống kê & Báo cáo
                </span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                <span className="bg-gradient-to-r from-emerald-200 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                  Doanh thu hệ thống
                </span>
              </h1>
              <p className="mt-3 text-base text-slate-400">
                Tổng hợp doanh thu đã xác nhận, biểu đồ theo tuần / tháng / năm và top xe, top tài xế.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500/20 p-2.5">
                  <Wallet className="h-7 w-7 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-300">
                    Trang thống kê doanh thu
                  </p>
                  <p className="mt-1 text-sm text-emerald-200/70">
                    Cập nhật theo thời gian thực
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Revenue Statistics */}
        <AdminRevenueStats />
      </div>
    </div>
  );
}
