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

        String username = auth.getName();
        Order order = orderOpt.get();

        // Only allow order owner or admin to initiate payment
        boolean isOwner = order.getUser() != null && order.getUser().getUsername().equals(username);
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isOwner && !isAdmin) {
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
        String orderCode = (txnRef != null && txnRef.contains("_"))
                ? txnRef.substring(0, txnRef.lastIndexOf("_"))
                : txnRef;
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
