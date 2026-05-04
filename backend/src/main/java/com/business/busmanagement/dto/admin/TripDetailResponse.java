package com.business.busmanagement.dto.admin;

import com.business.busmanagement.model.Trip;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TripDetailResponse {

    private Long id;
    private RouteInfo route;
    private BusInfo bus;
    private LocalDateTime departureTime;
    private LocalDateTime arrivalTime;
    private Trip.TripStatus status;
    private LocalDateTime actualDeparture;
    private LocalDateTime actualArrival;
    private int totalSeats;
    private int bookedSeats;
    private int availableSeats;
    private List<SeatInfo> seats;
    private List<TicketInfo> tickets;
    private BigDecimal estimatedRevenue;
    private BigDecimal actualRevenue;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RouteInfo {
        private Long id;
        private String origin;
        private String destination;
        private BigDecimal distanceKm;
        private Integer estimatedDurationMin;
        private BigDecimal basePrice;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BusInfo {
        private Long id;
        private String licensePlate;
        private String busType;
        private Integer totalSeats;
        private String status;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatInfo {
        private Long id;
        private String seatNumber;
        private Integer positionX;
        private Integer positionY;
        private boolean booked;
        private String bookedBy;
        private String passengerName;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TicketInfo {
        private Long id;
        private String seatNumber;
        private String passengerName;
        private String passengerPhone;
        private BigDecimal price;
        private String status;
        private LocalDateTime bookedAt;
    }
}
