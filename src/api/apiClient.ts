// ============================================================================
// API CLIENT — Axios instance + Interceptors
//   - Request interceptor: gắn Authorization: Bearer <token>
//   - Response interceptor: nếu 401 → xóa token + redirect /auth/login
// ============================================================================

import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  // Ưu tiên lấy token từ localStorage trực tiếp (đáng tin cậy nhất)
  let token = localStorage.getItem("token");

  // Fallback: thử từ auth-storage (Zustand persist)
  if (!token) {
    try {
      const authStorage = localStorage.getItem("auth-storage");
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        token = parsed?.state?.token ?? parsed?.token ?? null;
      }
    } catch (e) {
      console.debug("Failed to parse auth-storage:", e);
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.debug("Sending request to:", config.url, "with token:", token.substring(0, 20) + "...");
  } else {
    console.debug("No token found for request to:", config.url);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url ?? "unknown";

    console.debug("API Response Error:", {
      status,
      url,
      message: error?.message,
      data: error?.response?.data,
    });

    // Chỉ redirect cho các request cần auth khi là lỗi 401 (chưa đăng nhập)
    // 403 = đã đăng nhập nhưng không có quyền - KHÔNG redirect, để UI xử lý
    const isPrivateRequest = url?.includes("/private/") || url?.includes("/api/private/");
    const isAuthEndpoint = url?.includes("/auth/") || url?.includes("/login") || url?.includes("/register");

    // Nếu gặp 401 với request private (chưa đăng nhập / token hết hạn):
    // - Dispatch event "auth:expired" để UI/AuthContext xử lý (vd: mở modal login)
    // - KHÔNG tự ý xóa token ở đây, vì có thể gây mất session trong flow nhạy cảm
    //   (vd: PaymentReturnPage đang poll getMyTickets() sau khi redirect từ VNPay).
    //   Nếu cần logout, App-level listener sẽ quyết định.
    if (status === 401 && isPrivateRequest && !isAuthEndpoint) {
      try {
        window.dispatchEvent(new CustomEvent("auth:expired", { detail: { status, url } }));
      } catch (e) {
        // best-effort: nếu dispatch thất bại thì bỏ qua, UI sẽ tự handle khi thấy 401
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;