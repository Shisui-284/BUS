import { useEffect, useState } from "react";
import { apiGetVNPayReturnResult } from "../utils/api";

const VNPayPaymentPage = ({ showToast, navigate, onPlaceOrder }) => {
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState(null);

    useEffect(() => {
        const fetchResult = async () => {
            try {
                // Extract all vnp_* params from URL query string
                const params = {};
                const urlParams = new URLSearchParams(window.location.search);
                urlParams.forEach((value, key) => {
                    if (key.startsWith("vnp_")) {
                        params[key] = value;
                    }
                });

                const data = await apiGetVNPayReturnResult(params);
                setResult(data);

                if (data.success) {
                    // Restore order from localStorage and place it
                    const savedOrder = localStorage.getItem("pendingVNPayOrder");
                    if (savedOrder) {
                        const orderData = JSON.parse(savedOrder);
                        await onPlaceOrder(orderData);
                        localStorage.removeItem("pendingVNPayOrder");
                        localStorage.removeItem("pendingVNPayOrderCode");
                    }
                }
            } catch (error) {
                console.error("VNPay return error:", error);
                setResult({ success: false, message: "Có lỗi xảy ra khi xác nhận thanh toán" });
            } finally {
                setLoading(false);
            }
        };

        fetchResult();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Đang xác nhận thanh toán...</p>
                    <p className="text-gray-400 text-sm mt-1">Vui lòng không tắt trình duyệt</p>
                </div>
            </div>
        );
    }

    if (!result?.success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
                    <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Thanh toán thất bại</h2>
                    <p className="text-gray-600 mb-1">Mã phản hồi: {result?.responseCode}</p>
                    <p className="text-gray-500 text-sm mb-6">{getResponseMessage(result?.responseCode)}</p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => navigate("checkout")}
                            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Thử lại thanh toán
                        </button>
                        <button
                            onClick={() => navigate("home")}
                            className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                        >
                            Quay về trang chủ
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-green-600 mb-2">Thanh toán thành công!</h2>
                <p className="text-gray-600 mb-4">
                    Cảm ơn bạn đã thanh toán qua <strong>VNPay</strong>
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left text-sm">
                    <p><span className="text-gray-500">Mã giao dịch:</span> <span className="font-mono font-medium">{result?.txnRef}</span></p>
                    <p><span className="text-gray-500">Số tiền:</span> <span className="font-medium">{result?.amount?.toLocaleString()} VND</span></p>
                    <p><span className="text-gray-500">Ngân hàng:</span> {result?.bankCode || "N/A"}</p>
                    <p><span className="text-gray-500">Ngày thanh toán:</span> {formatPayDate(result?.payDate)}</p>
                </div>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => navigate("orders")}
                        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        Xem đơn hàng
                    </button>
                    <button
                        onClick={() => navigate("home")}
                        className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                        Tiếp tục mua sắm
                    </button>
                </div>
            </div>
        </div>
    );
};

const getResponseMessage = (code) => {
    const messages = {
        "00": "Giao dịch thành công",
        "07": "Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan đến fraud)",
        "09": "Giao dịch không thành công do: Thẻ/Tài khoản chưa đăng ký Internet Banking",
        "10": "Giao dịch không thành công do: Xác thực OTP fails 3 lần",
        "11": "Giao dịch không thành công do: Đã hết hạn chờ thanh toán",
        "12": "Giao dịch không thành công do: Thẻ/Tài khoản bị khóa",
        "13": "Giao dịch không thành công do: Nhập sai mật khẩu xác thực OTP",
        "24": "Giao dịch không thành công do: Khách hàng hủy giao dịch",
        "51": "Giao dịch không thành công do: Tài khoản không đủ tiền",
        "65": "Giao dịch không thành công do: Tài khoản đã vượt quá hạn mức giao dịch trong ngày",
        "75": "Ngân hàng đang bảo trì",
        "79": "Giao dịch không thành công do: Nhập sai mật khẩu thanh toán quá số lần quy định",
        "99": "Có lỗi không xác định",
    };
    return messages[code] || "Có lỗi không xác định";
};

const formatPayDate = (payDate) => {
    if (!payDate) return "N/A";
    // payDate format: yyyyMMddHHmmss -> "20250623152435"
    if (payDate.length === 14) {
        const y = payDate.substring(0, 4);
        const mo = payDate.substring(4, 6);
        const d = payDate.substring(6, 8);
        const h = payDate.substring(8, 10);
        const mi = payDate.substring(10, 12);
        const s = payDate.substring(12, 14);
        return `${d}/${mo}/${y} ${h}:${mi}:${s}`;
    }
    return payDate;
};

export default VNPayPaymentPage;
