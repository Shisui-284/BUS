package com.business.busmanagement.model;

/* ============================================================
 * Bảng: maintenance
 * Lịch sử bảo trì xe.
 * ============================================================ */

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "maintenance")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Maintenance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bus_id")
    @JsonIgnore
    private Bus bus;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(precision = 12, scale = 2)
    private BigDecimal cost;

    @Column(name = "maintenance_date")
    private LocalDate maintenanceDate;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED')")
    private MaintenanceStatus status;

    public enum MaintenanceStatus {
        SCHEDULED, IN_PROGRESS, COMPLETED
    }
}