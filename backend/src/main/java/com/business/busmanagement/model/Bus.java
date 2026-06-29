package com.business.busmanagement.model;

/* ============================================================
 * Bảng: buses
 * Thông tin xe: biển số, loại xe (sleeper/limousine/standard), tổng số ghế, ngày bảo trì cuối.
 * ============================================================ */

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "buses")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Bus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "license_plate", nullable = false, unique = true)
    private String licensePlate;

    @Enumerated(EnumType.STRING)
    @Column(name = "bus_type", columnDefinition = "ENUM('LIMOUSINE', 'SLEEPER', 'SEAT')")
    private BusType busType;

    @Column(name = "total_seats", nullable = false)
    private Integer totalSeats;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "ENUM('AVAILABLE', 'RUNNING', 'MAINTENANCE') DEFAULT 'AVAILABLE'")
    private BusStatus status = BusStatus.AVAILABLE;

    @Column(name = "last_maintenance_date")
    private LocalDate lastMaintenanceDate;

    @Column(name = "insurance_expiry")
    private LocalDate insuranceExpiry;

    @OneToMany(mappedBy = "bus", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Seat> seats;

    @OneToMany(mappedBy = "bus", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Trip> trips;

    @OneToMany(mappedBy = "bus", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Maintenance> maintenances;

    public enum BusType {
        LIMOUSINE, SLEEPER, SEAT
    }

    public enum BusStatus {
        AVAILABLE, RUNNING, MAINTENANCE
    }
}