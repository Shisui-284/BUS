package com.business.busmanagement.dto;

import com.business.busmanagement.model.Bus;
import com.business.busmanagement.model.Trip;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class TripResponse {
    private Long id;
    private Long routeId;
    private String routeName;
    private Long busId;
    private String busLabel;
    private LocalDateTime departureTime;
    private LocalDateTime arrivalTime;
    private Trip.TripStatus status;
    private List<TripAssignmentResponse> assignments;

    @Data
    @AllArgsConstructor
    public static class TripBusDto {
        private Long id;
        private String licensePlate;
        private Bus.BusType busType;
    }
}
