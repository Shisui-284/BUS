package com.business.busmanagement.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TicketResponse {
    // ── Vé ──────────────────────────────────────────────────────────
    private Long id;

    // ── Chuyến xe ───────────────────────────────────────────────────
    private Long tripId;
    private String origin;
    private String destination;
    private LocalDateTime departureTime;
    private LocalDateTime arrivalTime;

    // ── Xe ───────────────────────────────────────────────────────────
    private String busLicensePlate;
    private String busType;
    private String busLabel;

    // ── Ghế ──────────────────────────────────────────────────────────
    private String seatNumber;

    // ── Hành khách ──────────────────────────────────────────────────
    private String passengerName;
    private String passengerPhone;
    private String passengerEmail;

    // ── Thông tin đặt vé ─────────────────────────────────────────────
    private BigDecimal price;
    private String status;
    private LocalDateTime bookedAt;
    private LocalDateTime paidAt;

    // ── Thanh toán / Hóa đơn ────────────────────────────────────────
    private Long paymentId;
    private String paymentMethod;      // CASH, CARD, MOMO, BANK
    private String paymentStatus;     // PENDING, SUCCESS, FAILED
    private String transactionCode;
    private LocalDateTime transactionTime;

    // ── Mã vé (QR) ──────────────────────────────────────────────────
    private String ticketCode;        // Mã vé hiển thị: BUS-20260520-00001
}
