// ============================================================================
// PROTECTED ROUTE — Component bảo vệ route cần auth
// Check token + role; nếu không hợp lệ → redirect /auth/login
// ============================================================================

import { ReactNode, useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { UserRole } from "../../types";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { token, user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || !user) return;

    const path = location.pathname;

    if (path.startsWith("/admin/") && user.role !== "ADMIN") {
      navigate("/auth/login", { replace: true });
      return;
    }

    if (path.startsWith("/customer/") && user.role !== "CUSTOMER") {
      navigate("/auth/login", { replace: true });
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      const defaultPath: Record<string, string> = {
        ADMIN: "/admin/dashboard",
        CUSTOMER: "/customer/booking",
      };
      navigate(defaultPath[user.role] ?? "/auth/login", { replace: true });
    }
  }, [token, user, location.pathname, navigate, allowedRoles]);

  if (!token || !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
