import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, User, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../stores/authStore";
import { UserRole } from "../../types";
import { extractApiErrorMessage, extractApiStatus } from "../../utils/apiError";

const roleRedirect: Record<UserRole, string> = {
  ADMIN: "/admin/dashboard",
  CUSTOMER: "/customer/booking",
};

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("ADMIN");
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

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto grid max-w-6xl grid-cols-1 overflow-hidden rounded-3xl bg-white shadow-xl lg:grid-cols-2">
        <div className="relative bg-[#0F2849] p-10 text-white lg:px-12 lg:py-14">
          <div className="space-y-6">
            <div>
              <div className="text-3xl font-bold">XeKhách Pro</div>
              <p className="mt-3 max-w-md text-slate-300">
                Quản lý chuyến xe chuyên nghiệp cho hệ thống xe khách liên tỉnh.
              </p>
            </div>

            <div className="space-y-4 rounded-3xl bg-white/10 p-6">
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <ShieldCheck className="h-5 w-5" />
                Dashboard điều phối và theo dõi trạng thái real-time.
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <ShieldCheck className="h-5 w-5" />
                Kiểm tra xung đột lịch, phân công tài xế tự động.
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <ShieldCheck className="h-5 w-5" />
                Báo cáo doanh thu cơ bản & quản lý bảo dưỡng.
              </div>
            </div>
          </div>
        </div>

        <div className="p-10 lg:p-14">
          <div className="mx-auto max-w-md">
            <h1 className="text-3xl font-semibold text-slate-900">
              Đăng nhập hệ thống
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Nhập tài khoản để bắt đầu quản lý chuyến xe.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Chọn vai trò đăng nhập
                  <select
                    value={role}
                    onChange={(event) =>
                      setRole(event.target.value as UserRole)
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="CUSTOMER">CUSTOMER</option>
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Tên đăng nhập
                  <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-blue-500">
                    <User className="h-5 w-5 text-slate-400" />
                    <input
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="w-full border-none bg-transparent outline-none"
                      placeholder="Nhập tên đăng nhập"
                      required
                    />
                  </div>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Mật khẩu
                  <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-blue-500">
                    <Lock className="h-5 w-5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full border-none bg-transparent outline-none"
                      placeholder="Nhập mật khẩu"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-slate-400 transition hover:text-slate-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between text-sm text-slate-500">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-[#0F2849] focus:ring-[#0F2849]"
                  />
                  Ghi nhớ đăng nhập
                </label>
                <div>Admin dùng tài khoản được cấp sẵn</div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-2xl bg-[#0F2849] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1a3a6b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </form>
            <div className="mt-6 text-center text-sm text-slate-500">
              Chưa có tài khoản?{" "}
              <Link
                to="/auth/register"
                className="font-semibold text-[#0F2849] transition hover:text-[#1a3a6b]"
              >
                Đăng ký ngay
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
