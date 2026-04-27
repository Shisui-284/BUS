package com.business.busmanagement.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BusDetailResponse {

    private Long id;
    private String licensePlate;
    private String busType;
    private Integer totalSeats;
    private String status;
    private LocalDate lastMaintenanceDate;
    private LocalDate insuranceExpiry;
    private int assignedTripsCount;
}
