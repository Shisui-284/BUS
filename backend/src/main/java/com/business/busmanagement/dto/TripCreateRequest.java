package com.business.busmanagement.dto;

import com.business.busmanagement.model.Trip;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class TripCreateRequest {

    @NotNull(message = "Route is required")
    private Long routeId;

    @NotNull(message = "Bus is required")
    private Long busId;

    @NotNull(message = "Departure time is required")
    private LocalDateTime departureTime;

    @NotNull(message = "Arrival time is required")
    private LocalDateTime arrivalTime;

    private Trip.TripStatus status;
}
