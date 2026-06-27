const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/yourapp/api/v1";

// ============================================================
// POST /api/v1/vnpay/create
// Creates VNPay payment URL
// ============================================================
export const apiCreateVNPayPayment = async (orderCode, amount, locale = "vn", bankCode = "", email = "") => {
    const response = await fetch(`${API_BASE}/vnpay/create`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ orderCode, amount, locale, bankCode, email }),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create VNPay payment");
    }
    return response.json(); // { paymentUrl, txnRef }
};

// ============================================================
// GET /api/v1/vnpay/return
// Verifies VNPay return and returns payment result
// ============================================================
export const apiGetVNPayReturnResult = async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE}/vnpay/return?${queryString}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        throw new Error("Failed to get VNPay return result");
    }
    return response.json();
    // Returns: {
    //   success: boolean,
    //   txnRef: string,
    //   amount: number,
    //   responseCode: string,
    //   transactionStatus: string,
    //   bankCode: string,
    //   payDate: string
    // }
};
