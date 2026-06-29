// ============================================================================
// REGISTER PAGE — Trang đăng ký tài khoản CUSTOMER
// Chỉ cho tạo CUSTOMER (không cho tạo ADMIN từ API public)
// ============================================================================

import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, User, Mail, ShieldCheck, Bus, CheckCircle, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../stores/authStore";
import { extractApiErrorMessage, extractApiStatus } from "../../utils/apiError";
import Snowfall from "../../components/ui/Snowfall";

const roleRedirect: Record<string, string> = {
  ADMIN: "/admin/dashboard",
  CUSTOMER: "/customer/booking",
};

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const user = await register({ fullName, username, email, password });
      navigate(roleRedirect[user.role] ?? "/customer/booking");
      toast.success("Đăng ký thành công! Đã đăng nhập tự động.");
    } catch (error: unknown) {
      const status = extractApiStatus(error);
      const errorMessage = extractApiErrorMessage(error);
      let displayMessage = "Đăng ký thất bại. Vui lòng thử lại.";

      if (errorMessage.includes("Username already exists")) {
        displayMessage = "Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.";
      } else if (errorMessage.includes("Email already exists")) {
        displayMessage = "Email đã được sử dụng. Vui lòng chọn email khác.";
      } else if (status === 409) {
        displayMessage = "Dữ liệu đăng ký bị xung đột. Vui lòng kiểm tra lại.";
      } else if (errorMessage) {
        displayMessage = errorMessage;
      }

      toast.error(displayMessage);
    }
  };

  return (
    <div className="register-root">
      {/* Dark gradient background */}
      <div className="register-bg" />

      {/* Snowfall */}
      <Snowfall count={80} />

      {/* Ambient orbs */}
      <div className="register-orb register-orb-1" />
      <div className="register-orb register-orb-2" />

      {/* Floating decorative buses */}
      <div className="register-decor register-decor-1">
        <Bus className="w-8 h-8 text-blue-400/20" />
      </div>
      <div className="register-decor register-decor-2">
        <Bus className="w-6 h-6 text-purple-400/15" />
      </div>

      {/* Main card */}
      <div className="register-container">
        <div className="register-card">
          {/* Left brand panel */}
          <div className="register-brand-panel">
            <div className="register-brand-icon">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="register-brand-name">XeKhách Pro</h1>
            <p className="register-brand-tagline">
              Tham gia cộng đồng hành khách thông minh — đặt vé mọi lúc mọi nơi.
            </p>

            <div className="register-features">
              <div className="register-feature-item">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Đặt vé trực tuyến 24/7, thanh toán VNPAY an toàn</span>
              </div>
              <div className="register-feature-item">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Theo dõi lịch sử đặt vé, hoàn vé dễ dàng</span>
              </div>
              <div className="register-feature-item">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Gửi phản hồi & đánh giá chuyến đi</span>
              </div>
              <div className="register-feature-item">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Đăng ký nhanh, đăng nhập tức thì sau khi tạo tài khoản</span>
              </div>
            </div>

            <div className="register-notice">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400/70 flex-shrink-0" />
              <span>Chỉ tài khoản <strong className="text-white/80">KHÁCH HÀNG</strong> được tạo ở đây. Admin được cấp riêng.</span>
            </div>

            <div className="register-version-tag">v2.0 — 2026</div>
          </div>

          {/* Right form panel */}
          <div className="register-form-panel">
            <div className="register-form-inner">
              <div className="register-form-header">
                <h2 className="register-form-title">Tạo tài khoản</h2>
                <p className="register-form-subtitle">
                  Điền thông tin bên dưới để đăng ký tài khoản khách hàng
                </p>
              </div>

              <form onSubmit={handleSubmit} className="register-form-fields">
                {/* Full Name */}
                <div className="register-field-group">
                  <label className="register-label">Họ và tên</label>
                  <div className="register-input-wrapper">
                    <User className="register-input-icon" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="register-input"
                      placeholder="Nhập họ và tên đầy đủ"
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="register-field-group">
                  <label className="register-label">Tên đăng nhập</label>
                  <div className="register-input-wrapper">
                    <User className="register-input-icon" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="register-input"
                      placeholder="Chọn tên đăng nhập"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="register-field-group">
                  <label className="register-label">Email</label>
                  <div className="register-input-wrapper">
                    <Mail className="register-input-icon" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="register-input"
                      placeholder="Nhập địa chỉ email"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="register-field-group">
                  <label className="register-label">Mật khẩu</label>
                  <div className="register-input-wrapper">
                    <Lock className="register-input-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="register-input register-input-pw"
                      placeholder="Tạo mật khẩu"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="register-password-toggle"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="register-submit-btn"
                >
                  {isLoading ? (
                    <span className="register-spinner" />
                  ) : (
                    <>
                      <span>Đăng ký ngay</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <div className="register-login-link">
                Đã có tài khoản?{" "}
                <Link to="/auth/login" className="register-login-anchor">
                  Đăng nhập
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* ===== ROOT & BACKGROUND ===== */
        .register-root {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #181427;
        }

        .register-bg {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse at 20% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.06) 0%, transparent 60%),
            linear-gradient(180deg, #181427 0%, #201a32 40%, #181427 100%);
          z-index: 0;
        }

        /* ===== AMBIENT ORBS ===== */
        .register-orb {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          filter: blur(80px);
        }

        .register-orb-1 {
          width: 500px;
          height: 500px;
          top: -150px;
          left: -100px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%);
          animation: regOrbFloat1 8s ease-in-out infinite;
        }

        .register-orb-2 {
          width: 400px;
          height: 400px;
          bottom: -100px;
          right: -80px;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.14) 0%, transparent 70%);
          animation: regOrbFloat2 10s ease-in-out infinite;
        }

        @keyframes regOrbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, 20px) scale(1.05); }
        }

        @keyframes regOrbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, -30px) scale(1.08); }
        }

        /* ===== FLOATING DECOR ===== */
        .register-decor {
          position: fixed;
          pointer-events: none;
          z-index: 0;
          opacity: 0.6;
        }

        .register-decor-1 {
          top: 15%;
          right: 12%;
          animation: regDecorFloat1 7s ease-in-out infinite;
        }

        .register-decor-2 {
          bottom: 20%;
          left: 8%;
          animation: regDecorFloat2 9s ease-in-out infinite;
        }

        @keyframes regDecorFloat1 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }

        @keyframes regDecorFloat2 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(10px) rotate(-3deg); }
        }

        /* ===== MAIN CARD ===== */
        .register-container {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 960px;
          padding: 1rem;
        }

        .register-card {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          border-radius: 28px;
          overflow: hidden;
          background: rgba(32, 26, 50, 0.7);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(148, 163, 184, 0.15);
          box-shadow:
            0 30px 80px rgba(0, 0, 0, 0.6),
            0 0 60px rgba(16, 185, 129, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          animation: regCardFadeIn 0.6s ease-out;
        }

        @keyframes regCardFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ===== BRAND PANEL ===== */
        .register-brand-panel {
          padding: 3rem 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          background: linear-gradient(180deg, rgba(30, 26, 50, 0.9) 0%, rgba(20, 16, 38, 0.95) 100%);
          border-right: 1px solid rgba(148, 163, 184, 0.08);
          position: relative;
          overflow: hidden;
        }

        .register-brand-panel::before {
          content: '';
          position: absolute;
          top: -80px;
          left: -80px;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .register-brand-panel::after {
          content: '';
          position: absolute;
          bottom: -60px;
          right: -40px;
          width: 180px;
          height: 180px;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .register-brand-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
          animation: regIconPulse 3s ease-in-out infinite;
        }

        @keyframes regIconPulse {
          0%, 100% { box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3); }
          50% { box-shadow: 0 8px 32px rgba(16, 185, 129, 0.5), 0 0 40px rgba(16, 185, 129, 0.15); }
        }

        .register-brand-name {
          font-size: 1.875rem;
          font-weight: 800;
          background: linear-gradient(135deg, #34d399 0%, #10b981 55%, #f59e0b 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.03em;
          line-height: 1.1;
        }

        .register-brand-tagline {
          color: rgba(148, 163, 184, 0.8);
          font-size: 0.875rem;
          line-height: 1.6;
          margin-top: -0.5rem;
        }

        .register-features {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          margin-top: 0.5rem;
        }

        .register-feature-item {
          display: flex;
          align-items: flex-start;
          gap: 0.625rem;
          font-size: 0.8125rem;
          color: rgba(203, 213, 225, 0.75);
          line-height: 1.5;
        }

        .register-feature-item svg {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .register-notice {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.15);
          border-radius: 12px;
          font-size: 0.75rem;
          color: rgba(203, 213, 225, 0.65);
          line-height: 1.5;
        }

        .register-notice svg {
          flex-shrink: 0;
          margin-top: 1px;
        }

        .register-version-tag {
          margin-top: auto;
          font-size: 0.75rem;
          color: rgba(100, 116, 139, 0.6);
          padding-top: 1rem;
        }

        /* ===== FORM PANEL ===== */
        .register-form-panel {
          padding: 2.5rem 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .register-form-inner {
          width: 100%;
          max-width: 360px;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .register-form-header {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .register-form-title {
          font-size: 1.625rem;
          font-weight: 800;
          color: #f1f5f9;
          letter-spacing: -0.03em;
        }

        .register-form-subtitle {
          font-size: 0.8125rem;
          color: rgba(148, 163, 184, 0.7);
          line-height: 1.5;
        }

        .register-form-fields {
          display: flex;
          flex-direction: column;
          gap: 1.125rem;
        }

        .register-field-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .register-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: rgba(203, 213, 225, 0.8);
          letter-spacing: 0.01em;
        }

        /* ===== INPUTS ===== */
        .register-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .register-input-icon {
          position: absolute;
          left: 0.875rem;
          width: 16px;
          height: 16px;
          color: rgba(100, 116, 139, 0.7);
          pointer-events: none;
          flex-shrink: 0;
        }

        .register-input {
          width: 100%;
          padding: 0.75rem 0.875rem 0.75rem 2.5rem;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.12);
          background: rgba(24, 20, 39, 0.6);
          color: #f1f5f9;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
          outline: none;
        }

        .register-input::placeholder {
          color: rgba(100, 116, 139, 0.5);
        }

        .register-input:hover {
          border-color: rgba(148, 163, 184, 0.25);
          background: rgba(24, 20, 39, 0.8);
        }

        .register-input:focus {
          border-color: rgba(16, 185, 129, 0.6);
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
          background: rgba(30, 26, 50, 0.8);
        }

        .register-input-pw {
          padding-right: 2.5rem;
        }

        .register-password-toggle {
          position: absolute;
          right: 0.875rem;
          color: rgba(100, 116, 139, 0.6);
          padding: 4px;
          border-radius: 6px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          cursor: pointer;
        }

        .register-password-toggle:hover {
          color: rgba(203, 213, 225, 0.8);
        }

        /* ===== SUBMIT BUTTON ===== */
        .register-submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.875rem 1.5rem;
          border-radius: 16px;
          border: 0;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          font-size: 0.9375rem;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow:
            0 12px 28px rgba(16, 185, 129, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
          letter-spacing: 0.01em;
          margin-top: 0.25rem;
        }

        .register-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
          box-shadow:
            0 18px 36px rgba(16, 185, 129, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }

        .register-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .register-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .register-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: regSpin 0.7s linear infinite;
        }

        @keyframes regSpin {
          to { transform: rotate(360deg); }
        }

        /* ===== LOGIN LINK ===== */
        .register-login-link {
          text-align: center;
          font-size: 0.8125rem;
          color: rgba(148, 163, 184, 0.5);
        }

        .register-login-anchor {
          color: #34d399;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .register-login-anchor:hover {
          color: #6ee7b7;
          text-decoration: underline;
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 640px) {
          .register-card {
            grid-template-columns: 1fr;
            border-radius: 24px;
          }

          .register-brand-panel {
            padding: 2rem 1.5rem;
            border-right: none;
            border-bottom: 1px solid rgba(148, 163, 184, 0.08);
            gap: 1rem;
          }

          .register-brand-name {
            font-size: 1.5rem;
          }

          .register-form-panel {
            padding: 2rem 1.5rem;
          }

          .register-form-inner {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
