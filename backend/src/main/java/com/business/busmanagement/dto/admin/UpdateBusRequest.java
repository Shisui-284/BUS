package com.business.busmanagement.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateBusRequest {

    private String busType;
    private Integer totalSeats;
    private LocalDate lastMaintenanceDate;
    private LocalDate insuranceExpiry;
}
