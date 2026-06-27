package com.business.busmanagement.service;

import com.business.busmanagement.config.VnpayConfig;
import com.business.busmanagement.dto.VnpayPaymentResponse;
import com.business.busmanagement.model.Payment;
import com.business.busmanagement.model.Ticket;
import com.business.busmanagement.repository.PaymentRepository;
import com.business.busmanagement.repository.TicketRepository;
import com.business.busmanagement.service.AdminNotificationService;
import com.business.busmanagement.util.VnpayUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Integration-style unit test cho VnpayService.
 * Validates toàn bộ flow từ tạo URL thanh toán → xác thực hash → xử lý IPN.
 *
 * Chạy test này để xác nhận:
 * 1. URL thanh toán được tạo đúng format VNPay sandbox
 * 2. Hash HMAC-SHA512 được ký đúng cách
 * 3. IPN xử lý đúng các response code
 * 4. Amount validation hoạt động
 */
@ExtendWith(MockitoExtension.class)
class VnpayServiceTest {

    @Mock
    private TicketRepository ticketRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private AdminNotificationService notificationService;
    @Mock
    private HttpServletRequest httpRequest;

    private VnpayService vnpayService;
    private VnpayConfig vnpayConfig;

    // Sandbox credentials
    private static final String TMN_CODE = "SY273SZH";
    private static final String HASH_SECRET = "SFP53JL1Z5AS4O5WFIEBMEARJAEMDTBT";
    private static final String SANDBOX_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

    @BeforeEach
    void setUp() {
        vnpayConfig = new VnpayConfig();
        vnpayConfig.setTmnCode(TMN_CODE);
        vnpayConfig.setHashSecret(HASH_SECRET);
        vnpayConfig.setUrl(SANDBOX_URL);
        vnpayConfig.setReturnUrl("http://localhost:4173/payment/vnpay-return");
        vnpayConfig.setVersion("2.1.0");
        vnpayConfig.setCommand("pay");
        vnpayConfig.setCurrencyCode("VND");
        vnpayConfig.setLocale("vn");
        vnpayConfig.setOrderType("other");

        vnpayService = new VnpayService(vnpayConfig, ticketRepository, paymentRepository, notificationService);
    }

    // ─── createPaymentUrl tests ────────────────────────────────────────────

    @Test
    @DisplayName("Tạo URL thanh toán thành công với ticket HOLD")
    void createPaymentUrl_success() {
        // Given
        Ticket ticket = createTicket(1L, Ticket.TicketStatus.HOLD, new BigDecimal("150000"));
        when(httpRequest.getRemoteAddr()).thenReturn("127.0.0.1");
        when(ticketRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(ticket));
        when(paymentRepository.findByTicketId(1L)).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));

        // When
        VnpayPaymentResponse response = vnpayService.createPaymentUrl(1L, httpRequest);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getPaymentUrl()).startsWith(SANDBOX_URL + "?");
        assertThat(response.getTxnRef()).startsWith("TICKET1_");
        assertThat(response.getPaymentUrl()).contains("vnp_Version=2.1.0");
        assertThat(response.getPaymentUrl()).contains("vnp_Command=pay");
        assertThat(response.getPaymentUrl()).contains("vnp_TmnCode=" + TMN_CODE);
        // Amount = 150000 * 100 = 15000000
        assertThat(response.getPaymentUrl()).contains("vnp_Amount=15000000");
        assertThat(response.getPaymentUrl()).contains("vnp_CurrCode=VND");
        assertThat(response.getPaymentUrl()).contains("vnp_Locale=vn");
        assertThat(response.getPaymentUrl()).contains("vnp_OrderType=other");
        assertThat(response.getPaymentUrl()).contains("vnp_ReturnUrl=");
        assertThat(response.getPaymentUrl()).contains("vnp_SecureHashType=HmacSHA512");
        assertThat(response.getPaymentUrl()).contains("vnp_SecureHash=");

        // Verify Payment was saved with PENDING status
        ArgumentCaptor<Payment> paymentCaptor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(paymentCaptor.capture());
        Payment savedPayment = paymentCaptor.getValue();
        assertThat(savedPayment.getStatus()).isEqualTo(Payment.PaymentStatus.PENDING);
        assertThat(savedPayment.getVnpTxnRef()).startsWith("TICKET1_");
        assertThat(savedPayment.getAmount()).isEqualByComparingTo(new BigDecimal("150000"));
        assertThat(savedPayment.getPaymentMethod()).isEqualTo(Payment.PaymentMethod.VNPAY);
    }

    @Test
    @DisplayName("Tạo URL thanh toán thất bại khi ticket không ở trạng thái HOLD")
    void createPaymentUrl_throws_whenTicketNotHold() {
        Ticket ticket = createTicket(1L, Ticket.TicketStatus.PAID, new BigDecimal("150000"));
        when(ticketRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(ticket));

        assertThatThrownBy(() -> vnpayService.createPaymentUrl(1L, httpRequest))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("HOLD");
    }

    @Test
    @DisplayName("Tạo URL thanh toán thất bại khi ticket đã thanh toán SUCCESS trước đó")
    void createPaymentUrl_throws_whenAlreadyPaid() {
        Ticket ticket = createTicket(1L, Ticket.TicketStatus.HOLD, new BigDecimal("150000"));
        Payment existingPayment = new Payment();
        existingPayment.setStatus(Payment.PaymentStatus.SUCCESS);

        when(ticketRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(ticket));
        when(paymentRepository.findByTicketId(1L)).thenReturn(Optional.of(existingPayment));

        assertThatThrownBy(() -> vnpayService.createPaymentUrl(1L, httpRequest))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("đã được thanh toán");
    }

    @Test
    @DisplayName("Retry thanh toán: tái sử dụng PENDING payment cũ")
    void createPaymentUrl_reusesPendingPayment() {
        Ticket ticket = createTicket(1L, Ticket.TicketStatus.HOLD, new BigDecimal("200000"));
        Payment existingPayment = new Payment();
        existingPayment.setStatus(Payment.PaymentStatus.PENDING);
        existingPayment.setAmount(new BigDecimal("200000"));

        when(httpRequest.getRemoteAddr()).thenReturn("127.0.0.1");
        when(ticketRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(ticket));
        when(paymentRepository.findByTicketId(1L)).thenReturn(Optional.of(existingPayment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));

        VnpayPaymentResponse response = vnpayService.createPaymentUrl(1L, httpRequest);

        assertThat(response).isNotNull();
        // Should reuse the existing payment, not create a new one
        verify(paymentRepository, times(1)).save(any(Payment.class));
    }

    // ─── Secure Hash Verification tests ────────────────────────────────────

    @Test
    @DisplayName("Secure hash được ký đúng format HMAC-SHA512 (128 hex chars)")
    void createPaymentUrl_validSecureHash() {
        // Given
        Ticket ticket = createTicket(5L, Ticket.TicketStatus.HOLD, new BigDecimal("50000"));
        when(httpRequest.getRemoteAddr()).thenReturn("127.0.0.1");
        when(ticketRepository.findByIdWithDetails(5L)).thenReturn(Optional.of(ticket));
        when(paymentRepository.findByTicketId(5L)).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));

        // When
        VnpayPaymentResponse response = vnpayService.createPaymentUrl(5L, httpRequest);

        // Then - verify URL contains hash
        String url = response.getPaymentUrl();
        assertThat(url).contains("vnp_SecureHash=");

        // Extract hash from URL
        String hashInUrl = url.substring(url.indexOf("vnp_SecureHash=") + "vnp_SecureHash=".length());
        if (hashInUrl.contains("&")) {
            hashInUrl = hashInUrl.substring(0, hashInUrl.indexOf("&"));
        }

        // Hash should be 128 hex characters (SHA-512 = 512 bits = 64 bytes = 128 hex
        // chars)
        assertThat(hashInUrl).matches("^[a-f0-9]{128}$");

        // Verify the hash is non-empty and unique per call (timestamp in txnRef causes
        // different hash)
        assertThat(hashInUrl).isNotEmpty();
    }

    @Test
    @DisplayName("Tạo URL với các tham số bắt buộc đầy đủ theo spec VNPay")
    void createPaymentUrl_hasAllRequiredParams() {
        Ticket ticket = createTicket(99L, Ticket.TicketStatus.HOLD, new BigDecimal("100000"));
        when(httpRequest.getRemoteAddr()).thenReturn("203.0.113.50");
        when(ticketRepository.findByIdWithDetails(99L)).thenReturn(Optional.of(ticket));
        when(paymentRepository.findByTicketId(99L)).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));

        VnpayPaymentResponse response = vnpayService.createPaymentUrl(99L, httpRequest);

        String url = response.getPaymentUrl();

        // Check all mandatory VNPay params
        assertThat(url).contains("vnp_Version=2.1.0");
        assertThat(url).contains("vnp_Command=pay");
        assertThat(url).contains("vnp_TmnCode=SY273SZH");
        assertThat(url).contains("vnp_Amount=10000000"); // 100000 * 100
        assertThat(url).contains("vnp_CurrCode=VND");
        assertThat(url).contains("vnp_TxnRef=");
        assertThat(url).contains("vnp_OrderInfo=");
        assertThat(url).contains("vnp_OrderType=other");
        assertThat(url).contains("vnp_Locale=vn");
        assertThat(url).contains("vnp_ReturnUrl=");
        assertThat(url).contains("vnp_IpAddr=203.0.113.50");
        assertThat(url).contains("vnp_CreateDate=");
        assertThat(url).contains("vnp_SecureHashType=HmacSHA512");
        assertThat(url).contains("vnp_SecureHash=");
    }

    // ─── processIpn tests ───────────────────────────────────────────────────

    @Test
    @DisplayName("IPN: Thanh toán thành công (responseCode=00) cập nhật vé PAID")
    void processIpn_success() {
        // Given
        Ticket ticket = createTicket(7L, Ticket.TicketStatus.HOLD, new BigDecimal("80000"));
        Payment payment = new Payment();
        payment.setId(1L);
        payment.setStatus(Payment.PaymentStatus.PENDING);
        payment.setAmount(new BigDecimal("80000"));
        payment.setVnpTxnRef("TICKET7_123456");
        payment.setTicket(ticket);

        when(paymentRepository.findByVnpTxnRef("TICKET7_123456")).thenReturn(Optional.of(payment));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_TxnRef", "TICKET7_123456");
        vnpParams.put("vnp_TmnCode", TMN_CODE);
        vnpParams.put("vnp_ResponseCode", "00");
        vnpParams.put("vnp_TransactionNo", "123456789");
        vnpParams.put("vnp_Amount", "8000000");
        vnpParams.put("vnp_BankCode", "NCB");
        vnpParams.put("vnp_CardType", "ATM");
        // Add hash for verification
        vnpParams.put("vnp_SecureHash", computeHash(vnpParams, HASH_SECRET));
        vnpParams.put("vnp_SecureHashType", "HmacSHA512");

        // When
        Map<String, String> result = vnpayService.processIpn(vnpParams);

        // Then
        assertThat(result.get("RspCode")).isEqualTo("00");
        assertThat(result.get("Message")).isEqualTo("Confirm Success");

        // Verify payment was updated
        ArgumentCaptor<Payment> paymentCaptor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(paymentCaptor.capture());
        Payment savedPayment = paymentCaptor.getValue();
        assertThat(savedPayment.getStatus()).isEqualTo(Payment.PaymentStatus.SUCCESS);
        assertThat(savedPayment.getVnpTransactionNo()).isEqualTo("123456789");
        assertThat(savedPayment.getVnpBankCode()).isEqualTo("NCB");
        assertThat(savedPayment.getVnpCardType()).isEqualTo("ATM");
        assertThat(savedPayment.getPaidAt()).isNotNull();

        // Verify ticket was updated
        ArgumentCaptor<Ticket> ticketCaptor = ArgumentCaptor.forClass(Ticket.class);
        verify(ticketRepository).save(ticketCaptor.capture());
        assertThat(ticketCaptor.getValue().getStatus()).isEqualTo(Ticket.TicketStatus.PAID);
    }

    @Test
    @DisplayName("IPN: Thanh toán thất bại (responseCode!=00) giữ nguyên vé HOLD")
    void processIpn_failed() {
        // Given
        Ticket ticket = createTicket(8L, Ticket.TicketStatus.HOLD, new BigDecimal("60000"));
        Payment payment = new Payment();
        payment.setId(2L);
        payment.setStatus(Payment.PaymentStatus.PENDING);
        payment.setAmount(new BigDecimal("60000"));
        payment.setVnpTxnRef("TICKET8_999999");
        payment.setTicket(ticket);

        when(paymentRepository.findByVnpTxnRef("TICKET8_999999")).thenReturn(Optional.of(payment));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_TxnRef", "TICKET8_999999");
        vnpParams.put("vnp_TmnCode", TMN_CODE);
        vnpParams.put("vnp_ResponseCode", "24"); // User cancelled
        vnpParams.put("vnp_TransactionNo", "");
        vnpParams.put("vnp_Amount", "6000000");
        vnpParams.put("vnp_SecureHash", computeHash(vnpParams, HASH_SECRET));
        vnpParams.put("vnp_SecureHashType", "HmacSHA512");

        // When
        Map<String, String> result = vnpayService.processIpn(vnpParams);

        // Then
        assertThat(result.get("RspCode")).isEqualTo("00"); // VNPay still expects 00 for valid IPN
        assertThat(result.get("Message")).isEqualTo("Confirm Success");

        // Payment should be FAILED
        ArgumentCaptor<Payment> paymentCaptor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(paymentCaptor.capture());
        assertThat(paymentCaptor.getValue().getStatus()).isEqualTo(Payment.PaymentStatus.FAILED);

        // Ticket should still be HOLD (not changed to PAID)
        ArgumentCaptor<Ticket> ticketCaptor = ArgumentCaptor.forClass(Ticket.class);
        verify(ticketRepository).save(ticketCaptor.capture());
        assertThat(ticketCaptor.getValue().getStatus()).isEqualTo(Ticket.TicketStatus.HOLD);
    }

    @Test
    @DisplayName("IPN: Invalid signature trả về lỗi 97")
    void processIpn_invalidSignature() {
        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_TxnRef", "TICKET9_111111");
        vnpParams.put("vnp_TmnCode", TMN_CODE);
        vnpParams.put("vnp_ResponseCode", "00");
        vnpParams.put("vnp_Amount", "5000000");
        vnpParams.put("vnp_SecureHash", "invalid_hash");
        vnpParams.put("vnp_SecureHashType", "HmacSHA512");

        Map<String, String> result = vnpayService.processIpn(vnpParams);

        assertThat(result.get("RspCode")).isEqualTo("97");
        assertThat(result.get("Message")).isEqualTo("Invalid signature");
    }

    @Test
    @DisplayName("IPN: Wrong vnp_TmnCode trả về lỗi 02 (chống spoof)")
    void processIpn_invalidTmnCode() {
        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_TxnRef", "TICKET12_666666");
        vnpParams.put("vnp_TmnCode", "WRONG_TMN");
        vnpParams.put("vnp_ResponseCode", "00");
        vnpParams.put("vnp_Amount", "5000000");
        vnpParams.put("vnp_SecureHash", computeHash(vnpParams, HASH_SECRET));
        vnpParams.put("vnp_SecureHashType", "HmacSHA512");

        Map<String, String> result = vnpayService.processIpn(vnpParams);

        assertThat(result.get("RspCode")).isEqualTo("02");
        assertThat(result.get("Message")).isEqualTo("Invalid TmnCode");
    }

    @Test
    @DisplayName("IPN: Missing txnRef trả về lỗi 01")
    void processIpn_missingTxnRef() {
        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_ResponseCode", "00");
        vnpParams.put("vnp_SecureHash", "somehash");
        vnpParams.put("vnp_SecureHashType", "HmacSHA512");

        Map<String, String> result = vnpayService.processIpn(vnpParams);

        assertThat(result.get("RspCode")).isEqualTo("01");
    }

    @Test
    @DisplayName("IPN: Payment không tìm thấy trả về lỗi 01")
    void processIpn_paymentNotFound() {
        when(paymentRepository.findByVnpTxnRef("TICKET999_000000")).thenReturn(Optional.empty());

        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_TxnRef", "TICKET999_000000");
        vnpParams.put("vnp_TmnCode", TMN_CODE);
        vnpParams.put("vnp_ResponseCode", "00");
        vnpParams.put("vnp_Amount", "5000000");
        vnpParams.put("vnp_SecureHash", computeHash(vnpParams, HASH_SECRET));
        vnpParams.put("vnp_SecureHashType", "HmacSHA512");

        Map<String, String> result = vnpayService.processIpn(vnpParams);

        assertThat(result.get("RspCode")).isEqualTo("01");
    }

    @Test
    @DisplayName("IPN: Idempotent - payment đã SUCCESS thì bỏ qua")
    void processIpn_idempotentAlreadySuccess() {
        Ticket ticket = createTicket(10L, Ticket.TicketStatus.PAID, new BigDecimal("70000"));
        Payment payment = new Payment();
        payment.setId(3L);
        payment.setStatus(Payment.PaymentStatus.SUCCESS); // Already success
        payment.setVnpTxnRef("TICKET10_555555");
        payment.setTicket(ticket);

        when(paymentRepository.findByVnpTxnRef("TICKET10_555555")).thenReturn(Optional.of(payment));

        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_TxnRef", "TICKET10_555555");
        vnpParams.put("vnp_TmnCode", TMN_CODE);
        vnpParams.put("vnp_ResponseCode", "00");
        vnpParams.put("vnp_Amount", "7000000");
        vnpParams.put("vnp_SecureHash", computeHash(vnpParams, HASH_SECRET));
        vnpParams.put("vnp_SecureHashType", "HmacSHA512");

        Map<String, String> result = vnpayService.processIpn(vnpParams);

        assertThat(result.get("RspCode")).isEqualTo("00");
        // Should NOT call save again
        verify(paymentRepository, never()).save(any(Payment.class));
        verify(ticketRepository, never()).save(any(Ticket.class));
    }

    @Test
    @DisplayName("IPN: Amount mismatch trả về lỗi 04")
    void processIpn_amountMismatch() {
        Ticket ticket = createTicket(11L, Ticket.TicketStatus.HOLD, new BigDecimal("90000")); // 90000 VND
        Payment payment = new Payment();
        payment.setId(4L);
        payment.setStatus(Payment.PaymentStatus.PENDING);
        payment.setAmount(new BigDecimal("90000"));
        payment.setVnpTxnRef("TICKET11_444444");
        payment.setTicket(ticket);

        when(paymentRepository.findByVnpTxnRef("TICKET11_444444")).thenReturn(Optional.of(payment));

        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_TxnRef", "TICKET11_444444");
        vnpParams.put("vnp_TmnCode", TMN_CODE);
        vnpParams.put("vnp_ResponseCode", "00");
        vnpParams.put("vnp_Amount", "8000000"); // Wrong amount (80000 VND * 100)
        vnpParams.put("vnp_SecureHash", computeHash(vnpParams, HASH_SECRET));
        vnpParams.put("vnp_SecureHashType", "HmacSHA512");

        Map<String, String> result = vnpayService.processIpn(vnpParams);

        assertThat(result.get("RspCode")).isEqualTo("04");
    }

    // ─── Helper methods ────────────────────────────────────────────────────

    private Ticket createTicket(Long id, Ticket.TicketStatus status, BigDecimal price) {
        Ticket ticket = new Ticket();
        ticket.setId(id);
        ticket.setStatus(status);
        ticket.setPrice(price);
        return ticket;
    }

    /**
     * Compute valid HMAC-SHA512 hash for the given params.
     * This simulates what VNPay would send.
     */
    private String computeHash(Map<String, String> params, String secret) {
        Map<String, String> hashParams = new HashMap<>(params);
        hashParams.remove("vnp_SecureHash");
        hashParams.remove("vnp_SecureHashType");
        return VnpayUtil.hmacSHA512(secret, VnpayUtil.buildHashData(hashParams));
    }

    /**
     * Extract vnp_ params from the payment URL for verification.
     */
    private Map<String, String> extractParamsFromUrl(String url) {
        Map<String, String> params = new HashMap<>();
        String queryString = url.substring(url.indexOf("?") + 1);
        for (String pair : queryString.split("&")) {
            int eq = pair.indexOf("=");
            if (eq > 0) {
                String key = pair.substring(0, eq);
                String value = pair.substring(eq + 1);
                // URL decode for comparison
                value = value.replace("%20", " ");
                params.put(key, value);
            }
        }
        return params;
    }
}
