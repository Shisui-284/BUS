package com.business.busmanagement.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TicketListResponse {

    private Long id;
    private TripInfo trip;
    private String seatNumber;
    private String passengerName;
    private String passengerPhone;
    private String passengerEmail;
    private BigDecimal price;
    private String status;
    private String bookedBy;
    private LocalDateTime bookedAt;
    private PaymentInfo payment;
    private boolean canCancel;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TripInfo {
        private Long id;
        private String routeName;
        private String busLabel;
        private String departureTime;
        private String status;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentInfo {
        private Long id;
        private String method;
        private String status;
        private String paidAt;
    }
}
