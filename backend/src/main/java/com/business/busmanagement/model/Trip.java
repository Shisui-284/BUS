package com.business.busmanagement.model;

/* ============================================================
 * Bảng: trips
 * Quan hệ:
 *   - @ManyToOne Route (tuyến đường)
 *   - @ManyToOne Bus    (xe chạy chuyến)
 *   - @OneToMany Ticket
 * Status: SCHEDULED → RUNNING → COMPLETED, hoặc CANCELLED / DELAYED
 * ============================================================ */

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "trips")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id")
    @JsonIgnore
    private Route route;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bus_id")
    @JsonIgnore
    private Bus bus;

    @Column(name = "departure_time", nullable = false)
    private LocalDateTime departureTime;

    @Column(name = "arrival_time")
    private LocalDateTime arrivalTime;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "ENUM('SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED', 'DELAYED') DEFAULT 'SCHEDULED'")
    private TripStatus status = TripStatus.SCHEDULED;

    @Column(name = "actual_departure")
    private LocalDateTime actualDeparture;

    @Column(name = "actual_arrival")
    private LocalDateTime actualArrival;

    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Ticket> tickets;

    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Cargo> cargos;

    public enum TripStatus {
        SCHEDULED, RUNNING, COMPLETED, CANCELLED, DELAYED
    }
}