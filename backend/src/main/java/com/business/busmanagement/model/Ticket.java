package com.business.busmanagement.model;

/* ============================================================
 * Bảng: tickets
 * Quan hệ:
 *   - @ManyToOne Trip
 *   - @ManyToOne Seat
 *   - @ManyToOne Passenger
 *   - @OneToOne Payment (1 vé tối đa 1 payment)
 * Status flow: HOLD → PAID → CONFIRMED, hoặc → CANCELLED / REFUNDED
 * Unique constraint: (trip_id, seat_id) — 1 ghế 1 vé / 1 chuyến
 * ============================================================ */

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "tickets", uniqueConstraints = @UniqueConstraint(columnNames = {"trip_id", "seat_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id")
    @JsonIgnore
    private Trip trip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_id")
    @JsonIgnore
    private Seat seat;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passenger_id")
    @JsonIgnore
    private Passenger passenger;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private TicketStatus status = TicketStatus.BOOKED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booked_by")
    @JsonIgnore
    private User bookedBy;

    @CreationTimestamp
    @Column(name = "booked_at")
    private LocalDateTime bookedAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @OneToOne(mappedBy = "ticket", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private Payment payment;

    // Điểm đón cụ thể (tên + địa chỉ)
    @Column(name = "pickup_point", length = 500)
    private String pickupPoint;

    // Điểm trả cụ thể (tên + địa chỉ)
    @Column(name = "dropoff_point", length = 500)
    private String dropoffPoint;

    public enum TicketStatus {
        BOOKED, HOLD, CONFIRMED, EXPIRED, PAID, CANCELLED, REFUNDED
    }
}
