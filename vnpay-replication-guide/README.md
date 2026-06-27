# VNPay Payment Integration - Setup Guide

A complete guide to replicate the VNPay payment gateway integration in any Spring Boot + React project.

## Table of Contents

1. [How VNPay Works](#how-vnpay-works)
2. [Register VNPay Sandbox Account](#register-vnpay-sandbox-account)
3. [Prerequisites](#prerequisites)
4. [Quick Start Checklist](#quick-start-checklist)
5. [Backend Setup (Spring Boot)](#backend-setup-spring-boot)
6. [Frontend Setup (React)](#frontend-setup-react)
7. [Configuration & Environment Variables](#configuration--environment-variables)
8. [Database Schema](#database-schema)
9. [Testing](#testing)

---

## How VNPay Works

VNPay is a Vietnamese payment gateway. Here's the full payment flow:

```
User selects VNPAY at Checkout
         │
         ▼
POST /api/v1/vnpay/create  (JWT required)
         │  Backend: verify order, generate payment URL with HMAC-SHA512 signature
         ▼
Frontend: window.location.href = paymentUrl
         │
         ▼
User pays on VNPAY website (sandbox.vnpayment.vn)
         │
         ├──────────────────────────────────────┐
         │                                      │
         ▼                                      ▼
   Payment Success                         Payment Failed
         │                                      │
         ▼                                      ▼
VNPAY calls POST /api/v1/vnpay/ipn      VNPAY calls POST /api/v1/vnpay/ipn
(server-to-server, HMAC verified)       │
         │                                      │
         ▼                                      ▼
Backend: set order PAID + CONFIRMED    Backend: set order FAILED
         │                                      │
         ▼                                      ▼
VNPAY redirects user to                 VNPAY redirects user to
GET /api/v1/vnpay/return               GET /api/v1/vnpay/return
         │                                      │
         ▼                                      ▼
Frontend: Show success/failure screen   Frontend: Show failure screen
```

**Key distinction:**
- **IPN (Instant Payment Notification)**: Server-to-server call from VNPay. **Always use this** to update order status reliably — works even if user closes browser.
- **Return URL**: Browser redirect back to your site. Used to display payment result to user.

---

## Register VNPay Sandbox Account

1. Go to: https://sandbox.vnpayment.vn/
2. Register a merchant account
3. After login, go to **Merchant Admin** → **Cấu hình tài khoản** (Account Configuration)
4. Copy these credentials:
   - **Terminal ID (TmnCode)**: e.g., `SY273SZH`
   - **Secret Key (Hash Secret)**: e.g., `SFP53JL1Z5AS4O5WFIEBMEARJAEMDTBT`
5. For production, register at: https://vnpayment.vn/

---

## Prerequisites

- **Backend**: Spring Boot 3.x, Java 17+, Maven/Gradle
- **Frontend**: React 18+, Vite or Create React App
- **Database**: MySQL 8.x
- **Payment Mode**: `sandbox` (testing) or `production`

---

## Quick Start Checklist

- [ ] Register at sandbox.vnpayment.vn and get TmnCode + HashSecret
- [ ] Create `VNPayConfig.java` (backend config)
- [ ] Create `VNPayService.java` (backend service)
- [ ] Create `VNPayController.java` (REST endpoints)
- [ ] Create `VNPayCreateRequest.java` (DTO)
- [ ] Add VNPay fields to `Order.java` entity (`vnpTxnRef`, `vnpTransactionNo`, `paymentMethod`)
- [ ] Add `updateVNPayTxnRef`, `updatePaymentSuccess`, `updatePaymentFailed` to OrderService
- [ ] Run SQL migration to add new columns to orders table
- [ ] Configure security: `POST /create` requires JWT, `/ipn` and `/return` are public
- [ ] Add `VNPayCreateRequest` DTO and API functions to frontend
- [ ] Add VNPay selection logic in CheckoutPage
- [ ] Create `VNPayPaymentPage.jsx` for return handling
- [ ] Add route `/vnpay-return` in App.jsx
- [ ] Add `.env` variables for both backend and frontend
- [ ] Test payment flow end-to-end

---

## Backend Setup (Spring Boot)

### 1. Directory Structure

```
backend/src/main/java/com/yourapp/
├── config/
│   └── VNPayConfig.java
├── controller/api/
│   └── VNPayController.java
├── dto/request/
│   └── VNPayCreateRequest.java
├── service/
│   ├── VNPayService.java
│   ├── OrderService.java      (modify existing)
│   └── OrderServiceImpl.java  (modify existing)
├── entity/
│   └── Order.java             (modify existing)
└── security/
    └── SecurityConfig.java    (modify existing)
```

### 2. VNPayConfig.java

Create at `src/main/java/com/yourapp/config/VNPayConfig.java`:

```java
package com.yourapp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class VNPayConfig {
    @Value("${app.vnpay.tmn-code}")
    private String vnpTmnCode;

    @Value("${app.vnpay.hash-secret}")
    private String vnpHashSecret;

    @Value("${app.vnpay.url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}")
    private String vnpUrl;

    @Value("${app.vnpay.return-url:http://localhost:5173/vnpay-return}")
    private String vnpReturnUrl;

    @Value("${app.vnpay.ipn-url:}")
    private String vnpIpnUrl;

    @Value("${app.vnpay.mode:sandbox}")
    private String vnpMode;

    public static final String VERSION = "2.1.0";
    public static final String COMMAND = "pay";
    public static final String ORDER_TYPE = "other";
    public static final String CURRENCY_CODE = "VND";
    public static final String LOCALE_VN = "vn";
    public static final String LOCALE_EN = "en";

    public String getVnpTmnCode() { return vnpTmnCode; }
    public String getVnpHashSecret() { return vnpHashSecret; }
    public String getVnpUrl() { return vnpUrl; }
    public String getVnpReturnUrl() { return vnpReturnUrl; }
    public String getVnpIpnUrl() { return vnpIpnUrl; }
    public String getVnpMode() { return vnpMode; }
}
```

### 3. VNPayCreateRequest.java

Create at `src/main/java/com/yourapp/dto/request/VNPayCreateRequest.java`:

```java
package com.yourapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public class VNPayCreateRequest {
    @NotBlank(message = "Order code is required")
    private String orderCode;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private BigDecimal amount;

    private String locale = "vn";
    private String bankCode = "";
    private String email = "";

    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getLocale() { return locale; }
    public void setLocale(String locale) { this.locale = locale; }
    public String getBankCode() { return bankCode; }
    public void setBankCode(String bankCode) { this.bankCode = bankCode; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}
```

### 4. VNPayService.java

Create at `src/main/java/com/yourapp/service/VNPayService.java`:

```java
package com.yourapp.service;

import com.yourapp.config.VNPayConfig;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.text.SimpleDateFormat;
import java.util.*;

@Service
public class VNPayService {
    private final VNPayConfig config;

    public VNPayService(VNPayConfig config) {
        this.config = config;
    }

    public String createPaymentUrl(long amount, String orderId, String orderInfo,
                                    String ipAddress, String locale) {
        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", VNPayConfig.VERSION);
        params.put("vnp_Command", VNPayConfig.COMMAND);
        params.put("vnp_TmnCode", config.getVnpTmnCode());
        params.put("vnp_Amount", String.valueOf(amount * 100L)); // VNPay uses "xu" (amount * 100)
        params.put("vnp_CurrCode", VNPayConfig.CURRENCY_CODE);
        params.put("vnp_TxnRef", orderId);
        params.put("vnp_OrderInfo", orderInfo);
        params.put("vnp_OrderType", VNPayConfig.ORDER_TYPE);

        String resolvedLocale = locale != null && !locale.isEmpty() ? locale : VNPayConfig.LOCALE_VN;
        if ("en".equals(resolvedLocale)) {
            params.put("vnp_Locale", VNPayConfig.LOCALE_EN);
        } else {
            params.put("vnp_Locale", VNPayConfig.LOCALE_VN);
        }

        params.put("vnp_ReturnUrl", config.getVnpReturnUrl());
        params.put("vnp_IpAddr", ipAddress);
        params.put("vnp_CreateDate", new SimpleDateFormat("yyyyMMddHHmmss").format(new Date()));

        String hashData = getHashData(params);
        String secureHash = hmacSHA512(config.getVnpHashSecret(), hashData);

        StringBuilder query = new StringBuilder();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (query.length() > 0) query.append("&");
            query.append(entry.getKey()).append("=")
                 .append(urlEncode(entry.getValue()));
        }

        return config.getVnpUrl() + "?" + query + "&vnp_SecureHash=" + secureHash;
    }

    private String getHashData(Map<String, String> params) {
        List<String> fieldNames = new ArrayList<>(params.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = params.get(fieldName);
            if (fieldValue != null && !fieldValue.isEmpty()) {
                hashData.append(fieldName).append("=").append(fieldValue);
                if (itr.hasNext()) hashData.append("&");
            }
        }
        return hashData.toString();
    }

    public String hmacSHA512(String key, String data) {
        try {
            Mac hmac512 = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKey = new SecretKeySpec(
                key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            hmac512.init(secretKey);
            byte[] hash = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("Error generating HMAC-SHA512", e);
        }
    }

    public boolean verifyReturn(Map<String, String> params) {
        if (!params.containsKey("vnp_SecureHashType") || !params.containsKey("vnp_SecureHash")) {
            return false;
        }
        String providedHash = params.get("vnp_SecureHash");
        Map<String, String> paramsCopy = new TreeMap<>(params);
        paramsCopy.remove("vnp_SecureHashType");
        paramsCopy.remove("vnp_SecureHash");
        String hashData = getHashData(paramsCopy);
        String calculatedHash = hmacSHA512(config.getVnpHashSecret(), hashData);
        return calculatedHash.equalsIgnoreCase(providedHash);
    }

    public boolean verifyIpn(Map<String, String> params) {
        return verifyReturn(params);
    }

    public VNPayResponse parseResponse(Map<String, String> params) {
        VNPayResponse response = new VNPayResponse();
        response.setTxnRef(params.get("vnp_TxnRef"));
        response.setTransactionId(params.get("vnp_TransactionNo"));
        response.setResponseCode(params.get("vnp_ResponseCode"));
        response.setTransactionStatus(params.get("vnp_TransactionStatus"));
        response.setBankCode(params.get("vnp_BankCode"));
        response.setPayDate(params.get("vnp_PayDate"));
        try {
            String amtStr = params.get("vnp_Amount");
            if (amtStr != null) {
                response.setAmount(Long.parseLong(amtStr) / 100L);
            }
        } catch (NumberFormatException ignored) {}
        return response;
    }

    private String urlEncode(String value) {
        try {
            return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8.toString());
        } catch (UnsupportedEncodingException e) {
            return value;
        }
    }

    public static class VNPayResponse {
        private String txnRef;
        private String transactionId;
        private long amount;
        private String responseCode;
        private String transactionStatus;
        private String bankCode;
        private String payDate;

        public boolean isSuccess() {
            return "00".equals(responseCode) && "00".equals(transactionStatus);
        }

        // Getters and setters
        public String getTxnRef() { return txnRef; }
        public void setTxnRef(String txnRef) { this.txnRef = txnRef; }
        public String getTransactionId() { return transactionId; }
        public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
        public long getAmount() { return amount; }
        public void setAmount(long amount) { this.amount = amount; }
        public String getResponseCode() { return responseCode; }
        public void setResponseCode(String responseCode) { this.responseCode = responseCode; }
        public String getTransactionStatus() { return transactionStatus; }
        public void setTransactionStatus(String transactionStatus) { this.transactionStatus = transactionStatus; }
        public String getBankCode() { return bankCode; }
        public void setBankCode(String bankCode) { this.bankCode = bankCode; }
        public String getPayDate() { return payDate; }
        public void setPayDate(String payDate) { this.payDate = payDate; }
    }
}
```

### 5. VNPayController.java

Create at `src/main/java/com/yourapp/controller/api/VNPayController.java`:

```java
package com.yourapp.controller.api;

import com.yourapp.dto.request.VNPayCreateRequest;
import com.yourapp.entity.Order;
import com.yourapp.repository.OrderRepository;
import com.yourapp.service.OrderService;
import com.yourapp.service.VNPayService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/vnpay")
public class VNPayController {
    private final VNPayService vnPayService;
    private final OrderService orderService;
    private final OrderRepository orderRepository;

    public VNPayController(VNPayService vnPayService, OrderService orderService,
                            OrderRepository orderRepository) {
        this.vnPayService = vnPayService;
        this.orderService = orderService;
        this.orderRepository = orderRepository;
    }

    @PostMapping("/create")
    public ResponseEntity<?> createPayment(
            @Valid @RequestBody VNPayCreateRequest request,
            Authentication auth,
            HttpServletRequest httpRequest) {

        String orderCode = request.getOrderCode();
        Optional<Order> orderOpt = orderRepository.findByOrderCode(orderCode);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Order not found: " + orderCode));
        }

        // Only allow the order owner or admin to create payment
        String username = auth.getName();
        Order order = orderOpt.get();
        if (!order.getUser().getUsername().equals(username) && !auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));
        }

        String txnRef = orderCode + "_" + System.currentTimeMillis();
        String ipAddress = getClientIp(httpRequest);
        String orderInfo = "Thanh toan don hang " + orderCode;

        long amountLong = request.getAmount().longValue();
        String paymentUrl = vnPayService.createPaymentUrl(
            amountLong, txnRef, orderInfo, ipAddress, request.getLocale());

        orderService.updateVNPayTxnRef(orderCode, txnRef);

        Map<String, String> result = new HashMap<>();
        result.put("paymentUrl", paymentUrl);
        result.put("txnRef", txnRef);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/ipn")
    public ResponseEntity<String> handleIpn(HttpServletRequest request) {
        Map<String, String> params = extractParams(request);

        if (!vnPayService.verifyIpn(params)) {
            return ResponseEntity.ok("{\"RspCode\":\"97\",\"Message\":\"Invalid signature\"}");
        }

        String txnRef = params.get("vnp_TxnRef");
        String orderCode = txnRef != null ? txnRef.split("_")[0] : null;
        String transactionNo = params.get("vnp_TransactionNo");

        if (orderCode == null) {
            return ResponseEntity.ok("{\"RspCode\":\"99\",\"Message\":\"Order not found\"}");
        }

        Optional<Order> orderOpt = orderRepository.findByOrderCode(orderCode);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.ok("{\"RspCode\":\"99\",\"Message\":\"Order not found\"}");
        }

        String responseCode = params.get("vnp_ResponseCode");
        if ("00".equals(responseCode)) {
            orderService.updatePaymentSuccess(orderCode, transactionNo);
            return ResponseEntity.ok("{\"RspCode\":\"00\",\"Message\":\"Success\"}");
        } else {
            orderService.updatePaymentFailed(orderCode);
            return ResponseEntity.ok("{\"RspCode\":\"00\",\"Message\":\"Confirm Success\"}");
        }
    }

    @GetMapping("/return")
    public ResponseEntity<?> handleReturn(HttpServletRequest request) {
        Map<String, String> params = extractParams(request);

        if (!vnPayService.verifyReturn(params)) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false, "message", "Invalid signature"));
        }

        VNPayService.VNPayResponse response = vnPayService.parseResponse(params);
        Map<String, Object> result = new HashMap<>();
        result.put("success", response.isSuccess());
        result.put("txnRef", response.getTxnRef());
        result.put("amount", response.getAmount());
        result.put("responseCode", response.getResponseCode());
        result.put("transactionStatus", response.getTransactionStatus());
        result.put("bankCode", response.getBankCode());
        result.put("payDate", response.getPayDate());

        return ResponseEntity.ok(result);
    }

    private Map<String, String> extractParams(HttpServletRequest request) {
        Map<String, String> params = new HashMap<>();
        request.getParameterMap().forEach((key, values) -> {
            if (values != null && values.length > 0) {
                params.put(key, values[0]);
            }
        });
        return params;
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty()) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }
}
```

### 6. OrderService Interface - Add These Methods

```java
// Add to your existing OrderService.java interface:
void updateVNPayTxnRef(String orderCode, String txnRef);
void updatePaymentSuccess(String orderCode, String transactionNo);
void updatePaymentFailed(String orderCode);
```

### 7. OrderServiceImpl - Add These Implementations

```java
// Add to your existing OrderServiceImpl.java:

@Override
public void updateVNPayTxnRef(String orderCode, String txnRef) {
    Order order = orderRepository.findByOrderCode(orderCode)
        .orElseThrow(() -> new RuntimeException("Order not found: " + orderCode));
    order.setVnpTxnRef(txnRef);
    order.setPaymentMethod("VNPAY");
    orderRepository.save(order);
}

@Override
public void updatePaymentSuccess(String orderCode, String transactionNo) {
    Order order = orderRepository.findByOrderCode(orderCode)
        .orElseThrow(() -> new RuntimeException("Order not found: " + orderCode));
    order.setPaymentStatus("PAID");
    order.setStatus("CONFIRMED"); // Auto-confirm on successful payment
    order.setVnpTransactionNo(transactionNo);
    order.setPaidAt(LocalDateTime.now());
    orderRepository.save(order);
}

@Override
public void updatePaymentFailed(String orderCode) {
    Order order = orderRepository.findByOrderCode(orderCode)
        .orElseThrow(() -> new RuntimeException("Order not found: " + orderCode));
    order.setPaymentStatus("FAILED");
    orderRepository.save(order);
}
```

### 8. Security Configuration

Add to your `SecurityConfig.java` (adjust the paths to match your app):

```java
// POST /create requires authentication (user must be logged in)
.requestMatchers(org.springframework.http.HttpMethod.POST, "/api/v1/vnpay/create").authenticated()

// /ipn and /return are public (VNPay verifies via HMAC signature, not JWT)
.requestMatchers("/api/v1/vnpay/ipn", "/api/v1/vnpay/return").permitAll()
```

---

## Frontend Setup (React)

### 1. API Functions

Add to your `src/utils/api.js`:

```javascript
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/yourapp/api/v1";

// POST /api/v1/vnpay/create
export const apiCreateVNPayPayment = async (orderCode, amount, locale = "vn", bankCode = "", email = "") => {
    const response = await fetch(`${API_BASE}/vnpay/create`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ orderCode, amount, locale, bankCode, email }),
    });
    if (!response.ok) throw new Error("Failed to create VNPay payment");
    return response.json(); // { paymentUrl, txnRef }
};

// GET /api/v1/vnpay/return
export const apiGetVNPayReturnResult = async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE}/vnpay/return?${queryString}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Failed to get VNPay return result");
    return response.json(); // { success, txnRef, amount, responseCode, ... }
};
```

### 2. CheckoutPage Integration

In your checkout page, when user selects VNPay payment method:

```javascript
import { apiCreateVNPayPayment } from "../utils/api";

const handleCheckout = async () => {
    // ... create order logic ...

    if (payMethod === "vnpay") {
        try {
            const { paymentUrl, txnRef } = await apiCreateVNPayPayment(
                orderCode,              // e.g., "ORD-A3F2B1C7"
                Math.round(total),     // Amount in VND (not * 100)
                "vn",                  // locale
                "",                    // bankCode - empty lets user select at VNPay
                userInfo.email || ""   // email for guest verification
            );

            // Save order info for when user returns from VNPay
            localStorage.setItem("pendingVNPayOrder", JSON.stringify(orderForStorage));
            localStorage.setItem("pendingVNPayOrderCode", orderCode);

            // Redirect to VNPay payment page
            window.location.href = paymentUrl;
        } catch (error) {
            console.error("VNPay error:", error);
            showToast("Có lỗi khi khởi tạo thanh toán VNPay", "error");
        }
    }
};
```

### 3. VNPayPaymentPage.jsx

Create `src/pages/VNPayPaymentPage.jsx`:

```javascript
import { useEffect, useState } from "react";
import { apiGetVNPayReturnResult } from "../utils/api";

const VNPayPaymentPage = ({ showToast, navigate, onPlaceOrder }) => {
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState(null);

    useEffect(() => {
        const fetchResult = async () => {
            try {
                // Extract all vnp_* params from URL
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
                    // Restore order from localStorage
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
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600">Đang xác nhận thanh toán...</p>
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Thanh toán thất bại</h2>
                    <p className="text-gray-600 mb-2">Mã phản hồi: {result?.responseCode}</p>
                    <p className="text-gray-500 text-sm mb-6">{getResponseMessage(result?.responseCode)}</p>
                    <button
                        onClick={() => navigate("checkout")}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-green-600 mb-2">Thanh toán thành công!</h2>
                <p className="text-gray-600 mb-2">Cảm ơn bạn đã thanh toán qua VNPay</p>
                <p className="text-gray-500 text-sm mb-6">
                    Mã giao dịch: {result?.txnRef}<br/>
                    Số tiền: {result?.amount?.toLocaleString()} VND
                </p>
                <button
                    onClick={() => navigate("orders")}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Xem đơn hàng
                </button>
            </div>
        </div>
    );
};

const getResponseMessage = (code) => {
    const messages = {
        "00": "Giao dịch thành công",
        "07": "Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan đến fraud)",
        "09": "Giao dịch không thành công do: Thẻ/Tài khoản chưa đăng ký Internet Banking",
        "10": "Giao dịch không thành công do: Xác thực楚OTP fails 3 lần",
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

export default VNPayPaymentPage;
```

### 4. App.jsx Routing

Add the VNPay return route:

```javascript
import VNPayPaymentPage from "./pages/VNPayPaymentPage";

// Inside your useEffect that detects current page:
useEffect(() => {
    const path = window.location.pathname;
    if (path === "/vnpay-return") {
        setCurrentPage("vnpay-return");
    }
}, []);

// In your page rendering switch:
case "vnpay-return":
    return <VNPayPaymentPage showToast={showToast} navigate={navigate} onPlaceOrder={handlePlaceOrder} />;
```

Add the route in React Router:

```javascript
import { BrowserRouter, Routes, Route } from "react-router-dom";

<BrowserRouter>
    <Routes>
        <Route path="/vnpay-return" element={<VNPayPaymentPage showToast={showToast} navigate={navigate} onPlaceOrder={handlePlaceOrder} />} />
        {/* ... other routes ... */}
    </Routes>
</BrowserRouter>
```

---

## Configuration & Environment Variables

### Backend `.env` (or `application.yaml`)

**.env file:**
```bash
# VNPay Payment Gateway
VNPAY_TMN_CODE=your_vnpay_tmn_code
VNPAY_HASH_SECRET=your_vnpay_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:5173/vnpay-return
VNPAY_IPN_URL=http://localhost:8080/yourapp/api/v1/vnpay/ipn
VNPAY_MODE=sandbox
```

**application.yaml (Spring Boot):**
```yaml
app:
  vnpay:
    tmn-code: ${VNPAY_TMN_CODE:YOUR_TMN_CODE}
    hash-secret: ${VNPAY_HASH_SECRET:YOUR_HASH_SECRET}
    url: ${VNPAY_URL:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}
    return-url: ${VNPAY_RETURN_URL:http://localhost:5173/vnpay-return}
    ipn-url: ${VNPAY_IPN_URL:http://localhost:8080/yourapp/api/v1/vnpay/ipn}
    mode: ${VNPAY_MODE:sandbox}
```

### Frontend `.env`

```bash
VITE_API_URL=http://localhost:8080/yourapp/api/v1
VITE_APP_URL=http://localhost:5173
```

---

## Database Schema

### 1. Modify Order Entity

Add these fields to your `Order.java` JPA entity:

```java
@Column(name = "vnp_txn_ref", length = 100)
private String vnpTxnRef;  // Format: ORD-XXXXXXXX_timestamp

@Column(name = "vnp_transaction_no", length = 50)
private String vnpTransactionNo;  // VNPay's actual transaction number

@Column(name = "payment_method", length = 50)
private String paymentMethod;  // Set to "VNPAY" when payment is initiated
```

### 2. SQL Migration

Run this SQL on your MySQL database:

```sql
-- Add VNPay columns to orders table
ALTER TABLE `orders`
ADD COLUMN `vnp_txn_ref` VARCHAR(100) NULL,
ADD COLUMN `vnp_transaction_no` VARCHAR(50) NULL,
ADD COLUMN `payment_method` VARCHAR(50) NULL;

-- Optional: ensure indexes for faster lookups
CREATE INDEX idx_orders_vnp_txn_ref ON `orders`(`vnp_txn_ref`);
CREATE INDEX idx_orders_payment_status ON `orders`(`payment_status`);
```

Or if using Flyway/Liquibase migrations, create a new migration file:

```sql
-- VXXX__add_vnpay_columns_to_orders.sql
ALTER TABLE `orders`
ADD COLUMN `vnp_txn_ref` VARCHAR(100) NULL,
ADD COLUMN `vnp_transaction_no` VARCHAR(50) NULL,
ADD COLUMN `payment_method` VARCHAR(50) NULL;
```

---

## Testing

### Test Payment Flow

1. Start your backend on `http://localhost:8080`
2. Start your frontend on `http://localhost:5173`
3. Login/register a user
4. Add items to cart
5. Go to checkout
6. Select **VNPay** as payment method
7. Click "Đặt hàng" — you should be redirected to VNPay sandbox
8. On VNPay sandbox page:
   - Use test card: `9704000000000008`
   - Cardholder name: `NGUYEN VAN A`
   - Date: `07/15`
   - OTP: `123456`
9. Click **Confirm** — payment should succeed
10. You should be redirected back to `/vnpay-return` with success screen

### Test Failure Flow

1. On VNPay sandbox, click **Cancel** instead of confirming
2. You should be redirected back with failure screen

### VNPay Response Codes

| Code | Meaning |
|------|---------|
| `00` | Transaction succeeded |
| `07` | Suspected fraud |
| `09` | Card not registered for Internet Banking |
| `10` | OTP verification failed 3 times |
| `11` | Payment page expired |
| `12` | Card/account locked |
| `24` | User cancelled |
| `51` | Insufficient funds |
| `65` | Daily transaction limit exceeded |
| `75` | Bank under maintenance |
| `79` | Wrong payment password |
| `97` | Invalid signature |
| `99` | Unknown error |

---

## Common Issues & Debugging

1. **"Invalid signature" (97)**: Check that `vnpHashSecret` matches exactly what's in VNPay merchant portal. Make sure you're using `TreeMap` for sorted parameters and `HMAC-SHA512`.

2. **Amount mismatch**: VNPay expects amount in "xu" (VND * 100). Make sure your backend multiplies by 100 before sending.

3. **IPN not called**: Make sure your IPN URL is publicly accessible (not localhost). Use ngrok for local testing: `ngrok http 8080`.

4. **Return URL shows wrong page**: Make sure the frontend route `/vnpay-return` is registered and the component renders.

5. **Order not found on IPN**: The `txnRef` format must be consistent. Use `orderCode_timestamp` format to extract `orderCode` from `txnRef`.
