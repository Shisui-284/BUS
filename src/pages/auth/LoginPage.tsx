// ============================================================================
// LOGIN PAGE — Trang đăng nhập
// Sau đăng nhập: redirect theo role (ADMIN → /admin/dashboard, CUSTOMER → /customer/booking)
// ============================================================================

import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, User, ShieldCheck, Bus } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../stores/authStore";
import { UserRole } from "../../types";
import { extractApiErrorMessage, extractApiStatus } from "../../utils/apiError";
import Snowfall from "../../components/ui/Snowfall";

import { GoogleLogin, CredentialResponse } from "@react-oauth/google";

const roleRedirect: Record<UserRole, string> = {
  ADMIN: "/admin/dashboard",
  CUSTOMER: "/customer/booking",
};

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("CUSTOMER");
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const user = await login({ username, password, role });
      const nextPath = roleRedirect[user.role] ?? "/admin/dashboard";
      navigate(nextPath);
    } catch (error: unknown) {
      const status = extractApiStatus(error);
      const backendMessage = extractApiErrorMessage(error);
      let displayMessage = backendMessage;

      if (status === 401 || backendMessage === "Invalid credentials") {
        displayMessage = "Tên đăng nhập hoặc mật khẩu không hợp lệ.";
      } else if (status === 409) {
        displayMessage = "Dữ liệu đăng nhập đang xung đột. Vui lòng thử lại.";
      }

      toast.error(displayMessage);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast.error("Không nhận được token từ Google");
      return;
    }
    
    try {
      const user = await useAuthStore.getState().googleLogin(credentialResponse.credential, role);
      const nextPath = roleRedirect[user.role] ?? "/admin/dashboard";
      navigate(nextPath);
      toast.success("Đăng nhập Google thành công!");
    } catch (error: unknown) {
      const backendMessage = extractApiErrorMessage(error);
      toast.error(backendMessage || "Đăng nhập Google thất bại");
    }
  };

  return (
    <div className="login-root">
      {/* Dark gradient background with atmospheric glows */}
      <div className="login-bg" />

      {/* Snowfall effect overlay */}
      <Snowfall count={120} />

      {/* Ambient decorative orbs */}
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />

      {/* Floating decorative buses */}
      <div className="login-decor login-decor-1">
        <Bus className="w-8 h-8 text-blue-400/20" />
      </div>
      <div className="login-decor login-decor-2">
        <Bus className="w-6 h-6 text-purple-400/15" />
      </div>

      {/* Main card */}
      <div className="login-container">
        <div className="login-card">
          {/* Left brand panel */}
          <div className="login-brand-panel">
            <div className="login-brand-icon">
              <Bus className="w-8 h-8 text-white" />
            </div>
            <h1 className="login-brand-name">XeKhách Pro</h1>
            <p className="login-brand-tagline">
              Hệ thống quản lý & đặt vé xe khách liên tỉnh thông minh
            </p>

            <div className="login-features">
              <div className="login-feature-item">
                <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>Dashboard điều phối real-time, theo dõi trạng thái chuyến xe</span>
              </div>
              <div className="login-feature-item">
                <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>Kiểm tra xung đột lịch & phân công tài xế tự động</span>
              </div>
              <div className="login-feature-item">
                <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>Báo cáo doanh thu & quản lý bảo dưỡng xe</span>
              </div>
              <div className="login-feature-item">
                <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>Đặt vé trực tuyến, thanh toán VNPAY an toàn</span>
              </div>
            </div>

            <div className="login-version-tag">v2.0 — 2026</div>
          </div>

          {/* Right form panel */}
          <div className="login-form-panel">
            <div className="login-form-inner">
              <div className="login-form-header">
                <h2 className="login-form-title">Đăng nhập</h2>
                <p className="login-form-subtitle">
                  Chọn vai trò và nhập thông tin tài khoản để tiếp tục
                </p>
              </div>

              <form onSubmit={handleSubmit} className="login-form-fields">
                {/* Role selector */}
                <div className="login-field-group">
                  <label className="login-label">Vai trò đăng nhập</label>
                  <div className="login-role-selector">
                    <button
                      type="button"
                      onClick={() => setRole("CUSTOMER")}
                      className={`login-role-btn ${role === "CUSTOMER" ? "active" : ""}`}
                    >
                      <span className="login-role-dot customer" />
                      Khách hàng
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("ADMIN")}
                      className={`login-role-btn ${role === "ADMIN" ? "active" : ""}`}
                    >
                      <span className="login-role-dot admin" />
                      Quản trị
                    </button>
                  </div>
                </div>

                {/* Username */}
                <div className="login-field-group">
                  <label className="login-label">Tên đăng nhập</label>
                  <div className="login-input-wrapper">
                    <User className="login-input-icon" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="login-input"
                      placeholder="Nhập tên đăng nhập"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="login-field-group">
                  <label className="login-label">Mật khẩu</label>
                  <div className="login-input-wrapper">
                    <Lock className="login-input-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="login-input"
                      placeholder="Nhập mật khẩu"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="login-password-toggle"
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

                {/* Remember + hint */}
                <div className="login-form-options">
                  <label className="login-checkbox-label">
                    <input
                      type="checkbox"
                      className="login-checkbox"
                    />
                    <span>Ghi nhớ đăng nhập</span>
                  </label>
                  {role === "ADMIN" && (
                    <span className="login-admin-hint">
                      Sử dụng tài khoản được cấp sẵn
                    </span>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="login-submit-btn"
                >
                  {isLoading ? (
                    <span className="login-spinner" />
                  ) : (
                    <>
                      <span>Đăng nhập</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <div className="flex items-center gap-4 my-2">
                <div className="h-px bg-slate-700/50 flex-1"></div>
                <span className="text-xs text-slate-500 font-medium">HOẶC</span>
                <div className="h-px bg-slate-700/50 flex-1"></div>
              </div>

              <div className="flex justify-center w-full bg-white/5 rounded-xl p-2 border border-slate-700/30 hover:bg-white/10 transition-colors">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    toast.error("Đăng nhập Google thất bại. Vui lòng thử lại.");
                  }}
                  useOneTap
                  theme="filled_black"
                  shape="rectangular"
                  size="large"
                  text="continue_with"
                  width="100%"
                />
              </div>

              <div className="login-register-link mt-2">
                Chưa có tài khoản?{" "}
                <Link to="/auth/register" className="login-register-anchor">
                  Đăng ký ngay
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* ===== ROOT & BACKGROUND ===== */
        .login-root {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #181427;
        }

        .login-bg {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse at 20% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(245, 158, 11, 0.06) 0%, transparent 60%),
            linear-gradient(180deg, #181427 0%, #201a32 40%, #181427 100%);
          z-index: 0;
        }

        /* ===== AMBIENT ORBS ===== */
        .login-orb {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          filter: blur(80px);
        }

        .login-orb-1 {
          width: 500px;
          height: 500px;
          top: -150px;
          left: -100px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
          animation: orbFloat1 8s ease-in-out infinite;
        }

        .login-orb-2 {
          width: 400px;
          height: 400px;
          bottom: -100px;
          right: -80px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.18) 0%, transparent 70%);
          animation: orbFloat2 10s ease-in-out infinite;
        }

        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, 20px) scale(1.05); }
        }

        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, -30px) scale(1.08); }
        }

        /* ===== FLOATING DECOR ===== */
        .login-decor {
          position: fixed;
          pointer-events: none;
          z-index: 0;
          opacity: 0.6;
        }

        .login-decor-1 {
          top: 15%;
          right: 12%;
          animation: decorFloat1 7s ease-in-out infinite;
        }

        .login-decor-2 {
          bottom: 20%;
          left: 8%;
          animation: decorFloat2 9s ease-in-out infinite;
        }

        @keyframes decorFloat1 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }

        @keyframes decorFloat2 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(10px) rotate(-3deg); }
        }

        /* ===== MAIN CARD ===== */
        .login-container {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 900px;
          padding: 1rem;
        }

        .login-card {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-radius: 28px;
          overflow: hidden;
          background: rgba(32, 26, 50, 0.7);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(148, 163, 184, 0.15);
          box-shadow:
            0 30px 80px rgba(0, 0, 0, 0.6),
            0 0 60px rgba(59, 130, 246, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          animation: cardFadeIn 0.6s ease-out;
        }

        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ===== BRAND PANEL ===== */
        .login-brand-panel {
          padding: 3rem 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          background: linear-gradient(180deg, rgba(30, 26, 50, 0.9) 0%, rgba(20, 16, 38, 0.95) 100%);
          border-right: 1px solid rgba(148, 163, 184, 0.08);
          position: relative;
          overflow: hidden;
        }

        .login-brand-panel::before {
          content: '';
          position: absolute;
          top: -80px;
          left: -80px;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .login-brand-panel::after {
          content: '';
          position: absolute;
          bottom: -60px;
          right: -40px;
          width: 180px;
          height: 180px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .login-brand-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
          animation: iconPulse 3s ease-in-out infinite;
        }

        @keyframes iconPulse {
          0%, 100% { box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 8px 32px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.15); }
        }

        .login-brand-name {
          font-size: 1.875rem;
          font-weight: 800;
          background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 55%, #f59e0b 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.03em;
          line-height: 1.1;
        }

        .login-brand-tagline {
          color: rgba(148, 163, 184, 0.8);
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .login-features {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          margin-top: 0.5rem;
        }

        .login-feature-item {
          display: flex;
          align-items: flex-start;
          gap: 0.625rem;
          font-size: 0.8125rem;
          color: rgba(203, 213, 225, 0.75);
          line-height: 1.5;
        }

        .login-feature-item svg {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .login-version-tag {
          margin-top: auto;
          font-size: 0.75rem;
          color: rgba(100, 116, 139, 0.6);
          padding-top: 1rem;
        }

        /* ===== FORM PANEL ===== */
        .login-form-panel {
          padding: 2.5rem 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-form-inner {
          width: 100%;
          max-width: 340px;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .login-form-header {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .login-form-title {
          font-size: 1.625rem;
          font-weight: 800;
          color: #f1f5f9;
          letter-spacing: -0.03em;
        }

        .login-form-subtitle {
          font-size: 0.8125rem;
          color: rgba(148, 163, 184, 0.7);
          line-height: 1.5;
        }

        .login-form-fields {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .login-field-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .login-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: rgba(203, 213, 225, 0.8);
          letter-spacing: 0.01em;
        }

        /* ===== ROLE SELECTOR ===== */
        .login-role-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }

        .login-role-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem 0.75rem;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.12);
          background: rgba(24, 20, 39, 0.5);
          color: rgba(148, 163, 184, 0.6);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .login-role-btn:hover {
          border-color: rgba(148, 163, 184, 0.25);
          color: rgba(203, 213, 225, 0.8);
          background: rgba(24, 20, 39, 0.8);
        }

        .login-role-btn.active {
          border-color: rgba(59, 130, 246, 0.5);
          background: rgba(59, 130, 246, 0.15);
          color: #f1f5f9;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .login-role-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .login-role-dot.customer {
          background: #ec4899;
          box-shadow: 0 0 6px rgba(236, 72, 153, 0.6);
        }

        .login-role-dot.admin {
          background: #3b82f6;
          box-shadow: 0 0 6px rgba(59, 130, 246, 0.6);
        }

        /* ===== INPUTS ===== */
        .login-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .login-input-icon {
          position: absolute;
          left: 0.875rem;
          width: 16px;
          height: 16px;
          color: rgba(100, 116, 139, 0.7);
          pointer-events: none;
          flex-shrink: 0;
        }

        .login-input {
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

        .login-input::placeholder {
          color: rgba(100, 116, 139, 0.5);
        }

        .login-input:hover {
          border-color: rgba(148, 163, 184, 0.25);
          background: rgba(24, 20, 39, 0.8);
        }

        .login-input:focus {
          border-color: rgba(187, 134, 252, 0.6);
          box-shadow: 0 0 0 4px rgba(187, 134, 252, 0.12);
          background: rgba(30, 26, 50, 0.8);
        }

        .login-password-toggle {
          position: absolute;
          right: 0.875rem;
          color: rgba(100, 116, 139, 0.6);
          padding: 4px;
          border-radius: 6px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
        }

        .login-password-toggle:hover {
          color: rgba(203, 213, 225, 0.8);
        }

        /* ===== OPTIONS ===== */
        .login-form-options {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .login-checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          color: rgba(148, 163, 184, 0.6);
          cursor: pointer;
          user-select: none;
        }

        .login-checkbox {
          width: 15px;
          height: 15px;
          border-radius: 4px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(24, 20, 39, 0.4);
          cursor: pointer;
          accent-color: #3b82f6;
        }

        .login-admin-hint {
          font-size: 0.75rem;
          color: rgba(245, 158, 11, 0.6);
          font-weight: 500;
        }

        /* ===== SUBMIT BUTTON ===== */
        .login-submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.875rem 1.5rem;
          border-radius: 16px;
          border: 0;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          font-size: 0.9375rem;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow:
            0 12px 28px rgba(59, 130, 246, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
          letter-spacing: 0.01em;
        }

        .login-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
          box-shadow:
            0 18px 36px rgba(59, 130, 246, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }

        .login-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ===== REGISTER LINK ===== */
        .login-register-link {
          text-align: center;
          font-size: 0.8125rem;
          color: rgba(148, 163, 184, 0.5);
        }

        .login-register-anchor {
          color: #60a5fa;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .login-register-anchor:hover {
          color: #93c5fd;
          text-decoration: underline;
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 640px) {
          .login-card {
            grid-template-columns: 1fr;
            border-radius: 24px;
          }

          .login-brand-panel {
            padding: 2rem 1.5rem;
            border-right: none;
            border-bottom: 1px solid rgba(148, 163, 184, 0.08);
            gap: 1rem;
          }

          .login-brand-name {
            font-size: 1.5rem;
          }

          .login-form-panel {
            padding: 2rem 1.5rem;
          }

          .login-form-inner {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
