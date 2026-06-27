// ============================================================
// HOW TO INTEGRATE VNPAY IN CheckoutPage.jsx
// ============================================================
// This file shows the VNPay-specific code to add to your
// existing CheckoutPage.jsx. Replace the checkout/payment
// section with this logic when user selects VNPay.

// --- IMPORT ---
import { apiCreateVNPayPayment } from "../utils/api"; // or "./vnpayApi" if using separate file

// --- CHECKOUT LOGIC ---
const handleCheckout = async () => {
    // ... your existing validation and order creation logic ...

    const payMethod = selectedPaymentMethod; // "cod" or "vnpay"

    if (payMethod === "vnpay") {
        try {
            // Call backend to create VNPay payment URL
            const { paymentUrl, txnRef } = await apiCreateVNPayPayment(
                result.orderCode,           // e.g., "ORD-A3F2B1C7"
                Math.round(total),          // Amount in VND (backend multiplies by 100)
                "vn",                       // Vietnamese locale
                "",                         // bankCode empty = let user select at VNPay
                userInfo.email || ""        // email for guest verification
            );

            // Save order info to localStorage for when user returns from VNPay
            localStorage.setItem("pendingVNPayOrder", JSON.stringify(orderForStorage));
            localStorage.setItem("pendingVNPayOrderCode", result.orderCode);

            // Redirect user to VNPay payment page
            window.location.href = paymentUrl;

        } catch (error) {
            console.error("VNPay error:", error);
            showToast("Có lỗi khi khởi tạo thanh toán VNPay", "error");
        }
    } else {
        // ... existing COD checkout logic ...
    }
};

// ============================================================
// HOW TO DETECT VNPAY RETURN IN App.jsx
// ============================================================
// In your main App.jsx, add this useEffect:

useEffect(() => {
    const path = window.location.pathname;
    if (path === "/vnpay-return") {
        setCurrentPage("vnpay-return");
    }
}, []);

// Then add to your page rendering switch/case:
case "vnpay-return":
    return <VNPayPaymentPage showToast={showToast} navigate={navigate} onPlaceOrder={handlePlaceOrder} />;
