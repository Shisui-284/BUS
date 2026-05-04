import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, User, Mail, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../stores/authStore";
import { extractApiErrorMessage, extractApiStatus } from "../../utils/apiError";

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
      const user = await register({
        fullName,
        username,
        email,
        password,
      });
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
    <div className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto grid max-w-6xl grid-cols-1 overflow-hidden rounded-3xl bg-white shadow-xl lg:grid-cols-2">
        <div className="relative bg-[#0F2849] p-10 text-white lg:px-12 lg:py-14">
          <div className="space-y-6">
            <div>
              <div className="text-3xl font-bold">XeKhách Pro</div>
              <p className="mt-3 max-w-md text-slate-300">
                Tạo tài khoản điều phối hoặc khách hàng để bắt đầu sử dụng.
              </p>
            </div>

            <div className="space-y-4 rounded-3xl bg-white/10 p-6">
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <ShieldCheck className="h-5 w-5" />
                Chỉ khách hàng tự đăng ký; admin dùng tài khoản được
                cấp.
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <ShieldCheck className="h-5 w-5" />
                Đăng ký nhanh, đăng nhập tự động sau khi tạo tài khoản.
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <ShieldCheck className="h-5 w-5" />
                Chỉ có vai trò CUSTOMER được tạo mới ở đây.
              </div>
            </div>
          </div>
        </div>

        <div className="p-10 lg:p-14">
          <div className="mx-auto max-w-md">
            <h1 className="text-3xl font-semibold text-slate-900">
              Đăng ký tài khoản
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Đăng ký tài khoản khách hàng và đăng nhập ngay vào hệ thống.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Họ và tên
                  <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-blue-500">
                    <User className="h-5 w-5 text-slate-400" />
                    <input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="w-full border-none bg-transparent outline-none"
                      placeholder="Nhập họ và tên"
                      required
                    />
                  </div>
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
                  Email
                  <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-blue-500">
                    <Mail className="h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full border-none bg-transparent outline-none"
                      placeholder="Nhập email"
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-2xl bg-[#0F2849] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1a3a6b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Đang đăng ký..." : "Đăng ký"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              Đã có tài khoản?{" "}
              <Link
                to="/auth/login"
                className="font-semibold text-[#0F2849] transition hover:text-[#1a3a6b]"
              >
                Đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
