package com.business.busmanagement.controller;

import com.business.busmanagement.dto.VnpayCreatePaymentRequest;
import com.business.busmanagement.dto.VnpayPaymentResponse;
import com.business.busmanagement.model.User;
import com.business.busmanagement.repository.TicketRepository;
import com.business.busmanagement.service.UserService;
import com.business.busmanagement.service.VnpayService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

/**
 * Controller xử lý các endpoint VNPay:
 * <ul>
 *   <li>{@code POST /api/private/payment/vnpay/create} — Tạo URL thanh toán (cần đăng nhập CUSTOMER)</li>
 *   <li>{@code GET  /api/public/payment/vnpay/return} — Return URL (user redirect về)</li>
 *   <li>{@code POST /api/public/payment/vnpay/ipn} — IPN callback (server-to-server từ VNPay)</li>
 * </ul>
 *
 * - createPayment: tạo URL redirect sang sandbox.vnpayment.vn
 * - paymentReturn: VNPay redirect user về sau khi thanh toán xong
 * - ipnCallback: VNPay gọi server-to-server để xác nhận
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class VnpayController {

    private final VnpayService vnpayService;
    private final TicketRepository ticketRepository;
    private final UserService userService;

    // ─────────────────────────────────────────────────────────────
    // PRIVATE — Tạo URL thanh toán VNPay
    // POST /api/private/payment/vnpay/create
    // Body: { ticketId: 123 }
    // Mục đích: Customer bấm "Thanh toán VNPay" → FE gọi API này → trả URL
    // redirect sang sandbox.vnpayment.vn
    // ─────────────────────────────────────────────────────────────
    @PostMapping("/private/payment/vnpay/create")
    public ResponseEntity<VnpayPaymentResponse> createPayment(
            @Valid @RequestBody VnpayCreatePaymentRequest request,
            HttpServletRequest httpRequest) {

        // Đảm bảo vé thuộc về user đang đăng nhập
        User currentUser = getCurrentUser();
        log.info("VNPay createPayment: userId={}, ticketId={}", currentUser.getId(), request.getTicketId());

        var ticket = ticketRepository.findByIdWithDetails(request.getTicketId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy vé #" + request.getTicketId()));
        if (ticket.getPassenger() == null
                || ticket.getPassenger().getUser() == null
                || !ticket.getPassenger().getUser().getId().equals(currentUser.getId())) {
            throw new SecurityException("Bạn không có quyền thanh toán vé này");
        }

        VnpayPaymentResponse response = vnpayService.createPaymentUrl(request.getTicketId(), httpRequest);
        return ResponseEntity.ok(response);
    }

    // ─────────────────────────────────────────────────────────────
    // PUBLIC — Return URL (user browser redirect về sau khi TT xong)
    // GET /api/public/payment/vnpay/return
    // Verify hash để chống spoof — đảm bảo params thực sự do VNPay gửi.
    // Xác thực chính thức để cập nhật DB vẫn do IPN xử lý.
    // ─────────────────────────────────────────────────────────────
    @GetMapping("/public/payment/vnpay/return")
    public ResponseEntity<Map<String, Object>> paymentReturn(
            @RequestParam Map<String, String> allParams) {
        Map<String, String> params = allParams;

        String responseCode = params.get("vnp_ResponseCode");
        String txnRef = params.get("vnp_TxnRef");
        log.info("VNPay return URL hit: txnRef={} responseCode={}", txnRef, responseCode);

        // Chống spoof: verify hash trước khi trả thông tin về frontend
        if (!vnpayService.verifyReturnHash(params)) {
            log.warn("VNPay return: hash verification failed for txnRef={}", txnRef);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Xác thực không hợp lệ");
            return ResponseEntity.ok(error);
        }

        // HACK CHO MÔI TRƯỜNG LOCALHOST: 
        // Do VNPay không thể gọi IPN về localhost, chúng ta sẽ ép cập nhật database ngay tại bước Return URL.
        try {
            vnpayService.processIpn(params);
        } catch (Exception e) {
            log.error("Lỗi khi xử lý IPN trực tiếp từ return url", e);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("txnRef", txnRef);
        response.put("responseCode", responseCode);
        response.put("transactionNo", params.get("vnp_TransactionNo"));
        response.put("amount", parseVnpAmount(params.get("vnp_Amount")).doubleValue());
        response.put("bankCode", params.get("vnp_BankCode"));
        response.put("cardType", params.get("vnp_CardType"));
        response.put("payDate", params.get("vnp_PayDate"));
        response.put("orderInfo", params.get("vnp_OrderInfo"));
        response.put("success", "00".equals(responseCode));
        return ResponseEntity.ok(response);
    }

    // ─────────────────────────────────────────────────────────────
    // PUBLIC — IPN callback (server-to-server, KHÔNG cần auth)
    // POST /api/public/payment/vnpay/ipn
    // VNPay gọi endpoint này để thông báo kết quả thanh toán.
    // Quan trọng: VNPay gửi application/x-www-form-urlencoded
    //
    // Dùng @RequestParam để Spring tự parse form-urlencoded thành Map
    // (giá trị đã được URL-decode 1 lần bởi Servlet container).
    // Trước đây dùng getParameterMap() thủ công nhưng hay bị consume body
    // do các filter upstream.
    // ─────────────────────────────────────────────────────────────
    @PostMapping(value = "/public/payment/vnpay/ipn",
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, String>> ipnCallback(
            @RequestParam Map<String, String> allParams) {
        Map<String, String> params = allParams;
        log.info("VNPay IPN received: txnRef={} responseCode={} amount={} bankCode={} tmnCode={}",
                params.get("vnp_TxnRef"),
                params.get("vnp_ResponseCode"),
                params.get("vnp_Amount"),
                params.get("vnp_BankCode"),
                params.get("vnp_TmnCode"));

        Map<String, String> result = vnpayService.processIpn(params);
        return ResponseEntity.ok(result);
    }

    // ── helpers ──

    private User getCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            log.error("No authenticated user found in security context");
            throw new SecurityException("Bạn chưa đăng nhập");
        }
        log.debug("Current authentication: name={}, authorities={}",
                authentication.getName(), authentication.getAuthorities());

        String username = authentication.getName();
        return userService.findByUsername(username)
                .orElseThrow(() -> {
                    log.error("User not found in database: {}", username);
                    return new SecurityException("User not found");
                });
    }

    private static BigDecimal parseVnpAmount(String vnpAmount) {
        try {
            if (vnpAmount == null || vnpAmount.isEmpty()) return BigDecimal.ZERO;
            return BigDecimal.valueOf(Long.parseLong(vnpAmount))
                    .divide(BigDecimal.valueOf(100));
        } catch (NumberFormatException ex) {
            return BigDecimal.ZERO;
        }
    }
}