package com.business.busmanagement.dto;

import com.business.busmanagement.model.Bus;
import com.business.busmanagement.model.Trip;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
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
    private Integer totalSeats;     // Tổng số ghế của xe
    private Integer bookedSeats;    // Số ghế đã đặt
    private Integer availableSeats;  // Số ghế còn trống

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TripBusDto {
        private Long id;
        private String licensePlate;
        private Bus.BusType busType;
    }
}
