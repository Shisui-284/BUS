package com.business.busmanagement.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TicketDetailResponse {

    private Long id;
    private TripDetail trip;
    private SeatDetail seat;
    private PassengerDetail passenger;
    private BigDecimal price;
    private String status;
    private UserDetail bookedBy;
    private LocalDateTime bookedAt;
    private LocalDateTime paidAt;
    private PaymentDetail payment;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TripDetail {
        private Long id;
        private Long routeId;
        private String routeName;
        private Long busId;
        private String busLabel;
        private LocalDateTime departureTime;
        private LocalDateTime arrivalTime;
        private String status;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatDetail {
        private Long id;
        private String seatNumber;
        private Integer positionX;
        private Integer positionY;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PassengerDetail {
        private Long id;
        private String fullName;
        private String phone;
        private String email;
        private String idCard;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserDetail {
        private Long id;
        private String username;
        private String role;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentDetail {
        private Long id;
        private BigDecimal amount;
        private String method;
        private String status;
        private String transactionCode;
        private LocalDateTime paidAt;
    }
}
