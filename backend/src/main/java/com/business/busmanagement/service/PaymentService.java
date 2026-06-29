package com.business.busmanagement.service;

/* ============================================================
 * PAYMENT SERVICE — Module: Thanh toán COD/MOMO/CARD (không qua VNPay)
 * Chức năng:
 *   - processPayment: tạo Payment record + set Ticket → PAID
 *   - Cho thanh toán trực tiếp tại quầy / MOMO / thẻ nội địa
 *   - VNPay thanh toán dùng VnpayService riêng
 * ============================================================ */

import com.business.busmanagement.model.Payment;
import com.business.busmanagement.model.Ticket;
import com.business.busmanagement.repository.PaymentRepository;
import com.business.busmanagement.repository.TicketRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final TicketRepository ticketRepository;

    @Transactional
    public Payment processPayment(Long ticketId, BigDecimal amount, Payment.PaymentMethod paymentMethod, String transactionCode) {
        Long safeTicketId = Objects.requireNonNull(ticketId, "ticketId is required");
        BigDecimal safeAmount = Objects.requireNonNull(amount, "amount is required");
        Payment.PaymentMethod safeMethod = Objects.requireNonNull(paymentMethod, "paymentMethod is required");

        if (safeAmount.signum() <= 0) {
            throw new IllegalArgumentException("Amount must be greater than 0");
        }

        Ticket ticket = ticketRepository.findById(safeTicketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        if (ticket.getStatus() == Ticket.TicketStatus.PAID) {
            throw new IllegalStateException("Ticket đã được thanh toán");
        }

        if (ticket.getPayment() != null) {
            throw new IllegalStateException("Ticket đã có bản ghi thanh toán.");
        }

        if (ticket.getPrice() == null || safeAmount.compareTo(ticket.getPrice()) != 0) {
            throw new IllegalArgumentException("Số tiền thanh toán không khớp với giá vé");
        }

        Payment payment = new Payment();
        payment.setTicket(ticket);
        payment.setAmount(safeAmount);
        payment.setPaymentMethod(safeMethod);
        payment.setStatus(Payment.PaymentStatus.SUCCESS);
        payment.setTransactionCode(transactionCode);
        payment.setPaidAt(LocalDateTime.now());

        ticket.setStatus(Ticket.TicketStatus.PAID);
        ticket.setPaidAt(LocalDateTime.now());
        ticket.setPayment(payment);

        ticketRepository.save(ticket);
        return paymentRepository.save(payment);
    }
}
