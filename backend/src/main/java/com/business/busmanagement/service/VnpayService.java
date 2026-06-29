package com.business.busmanagement.service;

/* ============================================================
 * VNPAY SERVICE — Module: Tích hợp cổng thanh toán VNPay
 * Chức năng:
 *   - createPaymentUrl: tạo URL redirect user sang sandbox.vnpayment.vn
 *   - verifyReturnHash / verifyIpnHash: xác thực chữ ký SHA512 (chống spoof)
 *   - processIpn: cập nhật Ticket → PAID/CONFIRMED, tạo Payment record
 *   - Gửi SSE notification cho admin khi thanh toán thành công
 * Lưu ý: IPN có thể trễ → xử lý IDEMPOTENT (gọi nhiều lần cũng OK)
 * ============================================================ */

import com.business.busmanagement.config.VnpayConfig;
import com.business.busmanagement.dto.VnpayPaymentResponse;
import com.business.busmanagement.exception.ResourceNotFoundException;
import com.business.busmanagement.model.Payment;
import com.business.busmanagement.model.Ticket;
import com.business.busmanagement.repository.PaymentRepository;
import com.business.busmanagement.repository.TicketRepository;
import com.business.busmanagement.util.VnpayUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
/**
 * Service xử lý tích hợp VNPay:
 * <ul>
 *   <li>Tạo URL thanh toán redirect user sang cổng VNPay</li>
 *   <li>Xác thực chữ ký từ IPN callback (server-to-server)</li>
 *   <li>Cập nhật trạng thái vé + payment sau khi nhận IPN</li>
 * </ul>
 * Lưu ý: VNPay sandbox có thể gọi IPN với delay, cần xử lý idempotent.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VnpayService {

    private final VnpayConfig vnpayConfig;
    private final TicketRepository ticketRepository;
    private final PaymentRepository paymentRepository;
    private final AdminNotificationService notificationService;

    /** Format ngày giờ chuẩn VNPay: yyyyMMddHHmmss (theo GMT+7) */
    private static final DateTimeFormatter VNP_DATETIME_FORMAT =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    /**
     * Tạo URL thanh toán VNPay cho một vé đang ở trạng thái HOLD.
     */
    @Transactional
    public VnpayPaymentResponse createPaymentUrl(Long ticketId, HttpServletRequest request) {
        Ticket ticket = ticketRepository.findByIdWithDetails(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy vé #" + ticketId));

        if (ticket.getStatus() != Ticket.TicketStatus.HOLD) {
            throw new IllegalStateException(
                    "Chỉ vé ở trạng thái chờ thanh toán (HOLD) mới có thể thanh toán online. Hiện tại: "
                            + ticket.getStatus());
        }

        // Tìm payment PENDING cũ (nếu user retry) qua query trực tiếp
        // Tránh dùng ticket.getPayment() vì lazy-loading có thể trả null không đáng tin
        Optional<Payment> existingPayment = paymentRepository.findByTicketId(ticket.getId());

        if (existingPayment.isPresent()
                && existingPayment.get().getStatus() == Payment.PaymentStatus.SUCCESS) {
            throw new IllegalStateException("Vé này đã được thanh toán thành công trước đó");
        }

        // Sinh mã tham chiếu giao dịch duy nhất
        String txnRef = "TICKET" + ticketId + "_" + System.currentTimeMillis();

        LocalDateTime now = LocalDateTime.now();

        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_Version", vnpayConfig.getVersion());
        vnpParams.put("vnp_Command", vnpayConfig.getCommand());
        vnpParams.put("vnp_TmnCode", vnpayConfig.getTmnCode());
        // Số tiền VNPay yêu cầu nhân 100, là số nguyên, không phần thập phân
        long amount = ticket.getPrice().multiply(BigDecimal.valueOf(100)).longValue();
        vnpParams.put("vnp_Amount", String.valueOf(amount));
        vnpParams.put("vnp_CurrCode", vnpayConfig.getCurrencyCode());
        vnpParams.put("vnp_TxnRef", txnRef);
        vnpParams.put("vnp_OrderInfo", "Thanh toan ve xe #" + ticket.getId());
        vnpParams.put("vnp_OrderType", vnpayConfig.getOrderType());
        vnpParams.put("vnp_Locale", vnpayConfig.getLocale());
        vnpParams.put("vnp_ReturnUrl", vnpayConfig.getReturnUrl());
        vnpParams.put("vnp_IpAddr", VnpayUtil.getClientIp(request));
        vnpParams.put("vnp_CreateDate", formatVnpDatetime(now));

        // URL thanh toán hết hạn sau expireMinutes phút (VNPay sẽ reject nếu user truy cập sau thời điểm này)
        String expireAt = formatVnpDatetime(now.plusMinutes(vnpayConfig.getExpireMinutes()));
        vnpParams.put("vnp_ExpireDate", expireAt);

        // Tạo / cập nhật Payment record
        Payment payment = existingPayment.orElseGet(Payment::new);
        payment.setTicket(ticket);
        payment.setAmount(ticket.getPrice());
        payment.setPaymentMethod(Payment.PaymentMethod.VNPAY);
        payment.setStatus(Payment.PaymentStatus.PENDING);
        payment.setVnpTxnRef(txnRef);
        payment.setTransactionCode(null); // sẽ update khi nhận IPN
        payment.setPaidAt(null);
        payment.setVnpTransactionNo(null);
        payment.setVnpBankCode(null);
        payment.setVnpCardType(null);
        payment.setVnpResponseCode(null);
        paymentRepository.save(payment);

        ticket.setPayment(payment);
        ticketRepository.save(ticket);

        String paymentUrl = VnpayUtil.buildPaymentUrl(vnpayConfig, vnpParams);
        log.info("Created VNPay URL for ticket #{} txnRef={} amount={} expiresAt={}",
                ticketId, txnRef, amount, expireAt);

        return VnpayPaymentResponse.builder()
                .paymentUrl(paymentUrl)
                .txnRef(txnRef)
                .expireAt(expireAt)
                .build();
    }

    /**
     * Xử lý IPN callback từ VNPay (server-to-server).
     */
    @Transactional
    public Map<String, String> processIpn(Map<String, String> vnpParams) {
        Map<String, String> result = new HashMap<>();
        String txnRef = vnpParams.get("vnp_TxnRef");
        String responseCode = vnpParams.get("vnp_ResponseCode");
        String transactionNo = vnpParams.get("vnp_TransactionNo");
        String secureHash = vnpParams.get("vnp_SecureHash");

        if (txnRef == null || txnRef.isEmpty()) {
            log.warn("VNPay IPN missing vnp_TxnRef");
            return ipnError("01", "Order not found");
        }

        // Bỏ 2 trường secure hash ra khỏi params trước khi verify
        Map<String, String> verifyParams = new HashMap<>(vnpParams);
        verifyParams.remove("vnp_SecureHash");
        verifyParams.remove("vnp_SecureHashType");

        // Validate vnp_TmnCode khớp với cấu hình merchant (chống spoof từ domain khác)
        String incomingTmnCode = vnpParams.get("vnp_TmnCode");
        if (incomingTmnCode == null || !incomingTmnCode.equals(vnpayConfig.getTmnCode())) {
            log.warn("VNPay IPN invalid vnp_TmnCode: incoming={} expected={}",
                    incomingTmnCode, vnpayConfig.getTmnCode());
            return ipnError("02", "Invalid TmnCode");
        }

        // Verify chữ ký HMAC-SHA512
        String recomputedHash = VnpayUtil.hmacSHA512(
                vnpayConfig.getHashSecret(),
                VnpayUtil.buildHashData(verifyParams));
        boolean hashValid = recomputedHash.equalsIgnoreCase(secureHash != null ? secureHash : "");

        if (!hashValid) {
            // Log chi tiết để debug
            log.warn("VNPay IPN invalid checksum for txnRef={}", txnRef);
            log.warn("  received secureHash  = {}", secureHash);
            log.warn("  recomputed           = {}", recomputedHash);
            log.warn("  hashData (signed)    = {}", VnpayUtil.buildHashData(verifyParams));
            log.warn("  verifyParams (sorted) = {}", new TreeMap<>(verifyParams));
            log.warn("  hashSecret (first 4) = {}...",
                    vnpayConfig.getHashSecret() != null && vnpayConfig.getHashSecret().length() >= 4
                            ? vnpayConfig.getHashSecret().substring(0, 4) : "null");
            return ipnError("97", "Invalid signature");
        }

        Optional<Payment> paymentOpt = paymentRepository.findByVnpTxnRef(txnRef);
        if (paymentOpt.isEmpty()) {
            log.warn("VNPay IPN: payment not found for txnRef={}", txnRef);
            return ipnError("01", "Order not found");
        }

        Payment payment = paymentOpt.get();

        // Idempotent: nếu đã SUCCESS thì return Confirm Success luôn
        if (payment.getStatus() == Payment.PaymentStatus.SUCCESS) {
            log.info("VNPay IPN: txnRef={} already SUCCESS, skipping", txnRef);
            return ipnOk();
        }

        Ticket ticket = payment.getTicket();
        if (ticket == null) {
            log.error("VNPay IPN: payment {} has no ticket", payment.getId());
            return ipnError("99", "Unknown error");
        }

        // Validate số tiền khớp với giá vé
        String amountStr = vnpParams.get("vnp_Amount");
        try {
            long vnpAmount = amountStr != null ? Long.parseLong(amountStr) : 0L;
            BigDecimal expectedAmount = ticket.getPrice().multiply(BigDecimal.valueOf(100));
            if (BigDecimal.valueOf(vnpAmount).compareTo(expectedAmount) != 0) {
                log.warn("VNPay IPN: amount mismatch for txnRef={} vnp={} expected={}",
                        txnRef, vnpAmount, expectedAmount);
                return ipnError("04", "Invalid amount");
            }
        } catch (NumberFormatException ex) {
            log.warn("VNPay IPN: invalid amount format for txnRef={}: {}", txnRef, amountStr);
            return ipnError("04", "Invalid amount");
        }

        boolean isSuccess = "00".equals(responseCode);

        // Cập nhật payment
        payment.setVnpTransactionNo(transactionNo);
        payment.setVnpBankCode(vnpParams.get("vnp_BankCode"));
        payment.setVnpCardType(vnpParams.get("vnp_CardType"));
        payment.setVnpResponseCode(responseCode);
        payment.setTransactionCode(buildTransactionCode(transactionNo, txnRef));

        if (isSuccess) {
            LocalDateTime paidAt = LocalDateTime.now();
            payment.setStatus(Payment.PaymentStatus.SUCCESS);
            payment.setPaidAt(paidAt);
            ticket.setStatus(Ticket.TicketStatus.PAID);
            ticket.setPaidAt(paidAt);
            log.info("VNPay payment SUCCESS for ticket #{} txnRef={}", ticket.getId(), txnRef);

            // Đẩy notification tới admin: vừa có payment VNPay thành công.
            // Admin có thể bấm "xác nhận" để chuyển vé sang CONFIRMED (gọi điện cho khách).
            try {
                Map<String, Object> payload = new HashMap<>();
                payload.put("ticketId", ticket.getId());
                payload.put("tripId", ticket.getTrip() != null ? ticket.getTrip().getId() : null);
                payload.put("seatNumber", ticket.getSeat() != null ? ticket.getSeat().getSeatNumber() : "");
                payload.put("passengerName", ticket.getPassenger() != null ? ticket.getPassenger().getFullName() : "");
                payload.put("passengerPhone", ticket.getPassenger() != null ? ticket.getPassenger().getPhone() : "");
                payload.put("amount", payment.getAmount());
                payload.put("vnpTxnRef", txnRef);
                payload.put("vnpTransactionNo", transactionNo);
                payload.put("vnpBankCode", vnpParams.get("vnp_BankCode"));
                payload.put("vnpCardType", vnpParams.get("vnp_CardType"));
                payload.put("paidAt", paidAt.toString());
                payload.put("pickupPoint", ticket.getPickupPoint());
                payload.put("dropoffPoint", ticket.getDropoffPoint());
                notificationService.broadcast("payment.vnpay.success", payload);
            } catch (Exception ex) {
                log.warn("Failed to broadcast payment.vnpay.success", ex);
            }
        } else {
            // Thanh toán thất bại: KHÔNG đổi ticket status, giữ HOLD để user retry
            payment.setStatus(Payment.PaymentStatus.FAILED);
            log.info("VNPay payment FAILED for ticket #{} txnRef={} code={}",
                    ticket.getId(), txnRef, responseCode);
        }

        ticketRepository.save(ticket);
        paymentRepository.save(payment);

        return ipnOk();
    }

    private Map<String, String> ipnOk() {
        Map<String, String> result = new HashMap<>();
        result.put("RspCode", "00");
        result.put("Message", "Confirm Success");
        return result;
    }

    private Map<String, String> ipnError(String code, String message) {
        Map<String, String> result = new HashMap<>();
        result.put("RspCode", code);
        result.put("Message", message);
        return result;
    }

    private static String formatVnpDatetime(LocalDateTime dt) {
        return dt.atZone(ZoneId.systemDefault())
                .withZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh"))
                .format(VNP_DATETIME_FORMAT);
    }

    private static String buildTransactionCode(String vnpTransactionNo, String txnRef) {
        if (vnpTransactionNo != null && !vnpTransactionNo.isEmpty()) {
            return "VNP" + vnpTransactionNo;
        }
        return txnRef;
    }

    /**
     * Xác thực chữ ký trên Return URL (query params từ user browser redirect về).
     * Dùng để chống spoof — đảm bảo params thực sự do VNPay gửi.
     * Trả về true nếu hash hợp lệ hoặc không có hash (vẫn kiểm tra format).
     * Trả về false nếu hash sai (có thể là attempt spoof).
     */
    public boolean verifyReturnHash(Map<String, String> params) {
        String secureHash = params.get("vnp_SecureHash");
        if (secureHash == null || secureHash.isEmpty()) {
            log.debug("VNPay return: no secureHash present");
            return false;
        }
        Map<String, String> verifyParams = new HashMap<>(params);
        verifyParams.remove("vnp_SecureHash");
        verifyParams.remove("vnp_SecureHashType");
        String recomputed = VnpayUtil.hmacSHA512(vnpayConfig.getHashSecret(),
                VnpayUtil.buildHashData(verifyParams));
        if (!recomputed.equalsIgnoreCase(secureHash)) {
            log.warn("VNPay return: hash mismatch. txnRef={}", params.get("vnp_TxnRef"));
            return false;
        }
        return true;
    }
}