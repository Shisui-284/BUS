// ============================================================================
// BOOKING HERO — Banner trang đặt vé (có ảnh xe khách)
// Ảnh nền: /public/hero-bus-station.png
// v2: subtitle dạng chip có icon — cache-bust 2026-06-29
// ============================================================================

import {
  Shield, Zap, Clock, MapPin, Sparkles, BadgeCheck, type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

interface BookingHeroProps {
  children?: ReactNode;
}

interface StatItem {
  icon: LucideIcon;
  value: string;
  label: string;
  color: string;
}

interface HighlightItem {
  icon: LucideIcon;
  text: string;
}

const HIGHLIGHTS: HighlightItem[] = [
  { icon: Zap,         text: "Đặt vé nhanh chóng" },
  { icon: Shield,      text: "Thanh toán an toàn với VNPay" },
  { icon: BadgeCheck,  text: "Xác nhận tức thì" },
];

const STATS: StatItem[] = [
  { icon: Zap, value: "100+", label: "Chuyến mỗi ngày", color: "text-amber-300" },
  { icon: MapPin, value: "50+", label: "Tuyến đường", color: "text-emerald-300" },
  { icon: Clock, value: "24/7", label: "Đặt vé mọi lúc", color: "text-sky-300" },
  { icon: Shield, value: "100%", label: "Thanh toán bảo mật", color: "text-rose-300" },
];

export default function BookingHero({ children }: BookingHeroProps) {
  return (
    <div className="booking-hero-wrap">
      {/* ===== TOP: Hero image rõ + text trắng ===== */}
      <div className="booking-hero-top">
        <img
          src="/hero-bus-station.png"
          alt="Bến xe hiện đại — XeKhách Pro"
          className="booking-hero-img"
          loading="eager"
          decoding="async"
        />

        {/* Overlays cho top */}
        <div className="booking-hero-overlay-top" />
        <div className="booking-hero-overlay-middle" />

        {/* Ambient orbs */}
        <div className="booking-hero-orb booking-hero-orb-1" />
        <div className="booking-hero-orb booking-hero-orb-2" />

        {/* Content */}
        <div className="booking-hero-content">
          <div className="booking-hero-badge">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nền tảng đặt vé xe khách #1 Việt Nam</span>
          </div>

          <h1 className="booking-hero-title">
            Khám phá mọi miền <span className="booking-hero-title-accent">Việt Nam</span>
          </h1>

          {/* Subtitle: bullet-separated highlights with icons (khớp ảnh mẫu) */}
          <ul className="booking-hero-subtitle">
            {HIGHLIGHTS.map((h, i) => {
              const Icon = h.icon;
              return (
                <li key={i} className="booking-hero-highlight">
                  <Icon className="booking-hero-highlight-icon" />
                  <span>{h.text}</span>
                </li>
              );
            })}
          </ul>

          <div className="booking-hero-stats">
            {STATS.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="booking-hero-stat">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                  <div>
                    <div className="booking-hero-stat-value">{stat.value}</div>
                    <div className="booking-hero-stat-label">{stat.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== BOTTOM: Ảnh mờ tiếp tục + form tìm chuyến overlay ===== */}
      <div className="booking-hero-bottom">
        {/* Lớp ảnh mờ bên dưới */}
        <img
          src="/hero-bus-station.png"
          alt=""
          aria-hidden="true"
          className="booking-hero-blur-img"
          loading="eager"
          decoding="async"
        />

        {/* White wash overlay — đảm bảo chữ dễ đọc */}
        <div className="booking-hero-blur-overlay" />

        {/* Content slot — form sẽ được render vào đây */}
        <div className="booking-hero-bottom-content">
          {children}
        </div>
      </div>

      <style>{`
        .booking-hero-wrap {
          position: relative;
          width: 100%;
          border-radius: 24px;
          overflow: hidden;
          box-shadow:
            0 24px 60px -12px rgba(15, 23, 42, 0.35),
            0 0 0 1px rgba(255, 255, 255, 0.4) inset;
          isolation: isolate;
        }

        /* ===== TOP: Hero image rõ ===== */
        .booking-hero-top {
          position: relative;
          width: 100%;
          height: 260px;
          overflow: hidden;
        }
        @media (min-width: 640px) { .booking-hero-top { height: 300px; } }
        @media (min-width: 1024px) { .booking-hero-top { height: 340px; } }

        .booking-hero-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 40%;
          transform: scale(1.02);
          animation: heroKenBurns 20s ease-in-out infinite alternate;
          will-change: transform;
        }

        @keyframes heroKenBurns {
          from { transform: scale(1.02) translateY(0); }
          to   { transform: scale(1.08) translateY(-1.5%); }
        }

        /* Top overlay: tối nhẹ phía trên + chuyển sang white ở dưới để blend với bottom */
        .booking-hero-overlay-top {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(15, 23, 42, 0.55) 0%,
            rgba(15, 23, 42, 0.25) 45%,
            rgba(15, 23, 42, 0.0) 70%
          );
        }
        .booking-hero-overlay-middle {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            transparent 0%,
            transparent 60%,
            rgba(255, 255, 255, 0.65) 95%,
            rgba(255, 255, 255, 0.9) 100%
          );
        }

        .booking-hero-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(70px);
        }
        .booking-hero-orb-1 {
          width: 280px; height: 280px;
          top: -60px; right: -40px;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.32) 0%, transparent 70%);
          animation: heroOrbFloat1 9s ease-in-out infinite;
        }
        .booking-hero-orb-2 {
          width: 240px; height: 240px;
          bottom: 20px; left: -30px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.28) 0%, transparent 70%);
          animation: heroOrbFloat2 11s ease-in-out infinite;
        }
        @keyframes heroOrbFloat1 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(-20px, 15px) scale(1.06); }
        }
        @keyframes heroOrbFloat2 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(15px, -20px) scale(1.08); }
        }

        .booking-hero-content {
          position: relative;
          z-index: 10;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 1.75rem 1.5rem;
          max-width: 720px;
        }
        @media (min-width: 640px) {
          .booking-hero-content { padding: 2.5rem 3rem; }
        }

        .booking-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.85rem;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 999px;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          width: fit-content;
          margin-bottom: 0.85rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        @media (min-width: 640px) {
          .booking-hero-badge { font-size: 0.8125rem; padding: 0.45rem 1rem; margin-bottom: 1rem; }
        }

        .booking-hero-title {
          font-size: 1.625rem;
          font-weight: 800;
          color: white;
          line-height: 1.15;
          letter-spacing: -0.025em;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
          margin: 0;
        }
        @media (min-width: 640px) { .booking-hero-title { font-size: 2.25rem; } }
        @media (min-width: 1024px) { .booking-hero-title { font-size: 2.75rem; } }

        .booking-hero-title-accent {
          background: linear-gradient(135deg, #fcd34d 0%, #fbbf24 60%, #f59e0b 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          display: inline-block;
        }

        /* Subtitle: danh sách bullet có icon — khớp với ảnh mẫu */
        .booking-hero-subtitle {
          list-style: none;
          margin: 0.6rem 0 0;
          padding: 0;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem 0.85rem;
          max-width: 560px;
        }

        .booking-hero-highlight {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: rgba(255, 255, 255, 0.95);
          font-size: 0.8125rem;
          font-weight: 500;
          text-shadow: 0 1px 6px rgba(0, 0, 0, 0.35);
          letter-spacing: 0.005em;
        }
        .booking-hero-highlight-icon {
          width: 0.95rem;
          height: 0.95rem;
          flex-shrink: 0;
          color: #fcd34d; /* amber-300 - nổi bật trên nền tối */
          filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.35));
        }

        /* Bullet phân cách giữa các cụm từ (chỉ chèn giữa, không ở đầu/cuối) */
        .booking-hero-subtitle .booking-hero-highlight + .booking-hero-highlight::before {
          content: '';
          display: inline-block;
          width: 4px;
          height: 4px;
          margin-right: 0.85rem;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.55);
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.4);
        }

        @media (min-width: 640px) {
          .booking-hero-subtitle {
            margin-top: 0.85rem;
            gap: 0.6rem 1rem;
          }
          .booking-hero-highlight { font-size: 0.9375rem; }
          .booking-hero-highlight-icon { width: 1.05rem; height: 1.05rem; }
        }

        .booking-hero-stats {
          margin-top: 1rem;
          display: none;
          gap: 0.6rem;
          flex-wrap: wrap;
        }
        @media (min-width: 768px) {
          .booking-hero-stats { display: flex; margin-top: 1.25rem; }
        }

        .booking-hero-stat {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 0.8rem;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 14px;
        }
        .booking-hero-stat-value {
          font-size: 0.875rem;
          font-weight: 700;
          color: white;
          line-height: 1.1;
        }
        .booking-hero-stat-label {
          font-size: 0.6875rem;
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.1;
          white-space: nowrap;
        }

        /* ===== BOTTOM: Ảnh mờ tiếp tục ===== */
        .booking-hero-bottom {
          position: relative;
          width: 100%;
          min-height: 200px;
          overflow: hidden;
        }
        @media (min-width: 1024px) {
          .booking-hero-bottom { min-height: 220px; }
        }

        /* Ảnh mờ - dùng filter blur + giảm brightness để text nổi bật */
        .booking-hero-blur-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 60%;
          filter: blur(18px) brightness(0.85) saturate(1.1);
          transform: scale(1.15);
          pointer-events: none;
          z-index: 0;
        }

        /* White-pink wash overlay - đảm bảo text rõ ràng */
        .booking-hero-blur-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.55) 0%,
              rgba(255, 241, 249, 0.78) 50%,
              rgba(253, 242, 248, 0.92) 100%
            );
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          z-index: 1;
        }

        .booking-hero-bottom-content {
          position: relative;
          z-index: 10;
          padding: 1.25rem 1rem 1.5rem;
        }
        @media (min-width: 640px) {
          .booking-hero-bottom-content { padding: 1.5rem 1.5rem 2rem; }
        }
        @media (min-width: 1024px) {
          .booking-hero-bottom-content { padding: 2rem 2rem 2.5rem; }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .booking-hero-img { animation: none; }
          .booking-hero-orb { animation: none; }
        }

        /* ===== SEARCH CARD (form tìm chuyến) ===== */
        .booking-hero-search-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(236, 72, 153, 0.18);
          border-radius: 20px;
          padding: 1.25rem 1.25rem;
          box-shadow:
            0 16px 40px -8px rgba(15, 23, 42, 0.18),
            0 0 0 1px rgba(255, 255, 255, 0.4) inset;
        }
        @media (min-width: 640px) {
          .booking-hero-search-card { padding: 1.75rem 1.75rem; }
        }

        .booking-hero-search-title {
          font-size: 1.125rem;
          font-weight: 800;
          color: #831843; /* pink-950 - đậm nhất để dễ đọc */
          margin-bottom: 1rem;
          letter-spacing: -0.015em;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        @media (min-width: 640px) {
          .booking-hero-search-title { font-size: 1.25rem; }
        }

        .booking-hero-search-title::before {
          content: '';
          display: inline-block;
          width: 4px;
          height: 1.25rem;
          background: linear-gradient(180deg, #ec4899, #db2777);
          border-radius: 2px;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}