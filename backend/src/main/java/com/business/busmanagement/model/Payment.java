package com.business.busmanagement.model;

/* ============================================================
 * Bảng: payments
 * Lưu lịch sử thanh toán cho 1 vé.
 * paymentMethod: CASH / CARD / MOMO / BANK / VNPAY
 * status: PENDING / SUCCESS / FAILED / REFUNDED
 * transactionCode: mã từ VNPay hoặc hệ thống tự sinh
 * ============================================================ */

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", unique = true)
    @JsonIgnore
    private Ticket ticket;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PaymentStatus status = PaymentStatus.PENDING;

    // Mã giao dịch của cổng thanh toán (VD: mã GD VNPay, mã GD ngân hàng...)
    // Có thể dài tới 100 ký tự (VNPay TxnRef + TransactionNo)
    @Column(name = "transaction_code", length = 100)
    private String transactionCode;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    // ── VNPay specific fields ────────────────────────────────────────
    // Mã tham chiếu giao dịch phía VNPay (vnp_TxnRef) - mình gửi lên
    @Column(name = "vnp_txn_ref", length = 100)
    private String vnpTxnRef;

    // Mã giao dịch phía VNPay (vnp_TransactionNo) - VNPay trả về
    @Column(name = "vnp_transaction_no", length = 50)
    private String vnpTransactionNo;

    // Mã ngân hàng thanh toán (vnp_BankCode) - VD: NCB, VCB
    @Column(name = "vnp_bank_code", length = 20)
    private String vnpBankCode;

    // Loại thẻ / hình thức thanh toán (vnp_CardType) - VD: ATM, QRCODE
    @Column(name = "vnp_card_type", length = 20)
    private String vnpCardType;

    // Response code từ VNPay (vnp_ResponseCode) - 00 = thành công
    @Column(name = "vnp_response_code", length = 10)
    private String vnpResponseCode;

    public enum PaymentMethod {
        CASH,   // Thanh toán khi lên xe (COD)
        CARD,   // Thẻ ngân hàng tại quầy
        MOMO,   // Ví MoMo
        BANK,   // Chuyển khoản QR thủ công (VietQR)
        VNPAY   // Thanh toán online qua cổng VNPay
    }

    public enum PaymentStatus {
        PENDING,   // Đang chờ thanh toán (chưa có IPN callback hoặc đang xử lý)
        SUCCESS,   // Thanh toán thành công
        FAILED     // Thanh toán thất bại / bị hủy
    }
}