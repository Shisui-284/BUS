package com.business.busmanagement.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RouteListResponse {

    private Long id;
    private String origin;
    private String destination;
    private BigDecimal distanceKm;
    private Integer estimatedDurationMin;
    private BigDecimal basePrice;
    private Boolean isActive;
}
