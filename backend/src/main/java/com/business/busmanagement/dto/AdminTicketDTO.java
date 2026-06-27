package com.business.busmanagement.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class AdminTicketDTO {
    private Long ticketId;
    private String routeName;
    private LocalDateTime departureTime;
    private String busInfo;
    private String seatNumber;
    private String passengerName;
    private String passengerPhone;
    private LocalDateTime bookedAt;
    private BigDecimal price;
    private String status;
    private String pickupPoint;
    private String dropoffPoint;

    public AdminTicketDTO(Long ticketId, String origin, String destination, LocalDateTime departureTime,
                          String licensePlate, Object busType, String seatNumber,
                          String passengerName, String passengerPhone, LocalDateTime bookedAt,
                          BigDecimal price, Object status,
                          String pickupPoint, String dropoffPoint) {

        this.ticketId = ticketId;
        this.routeName = (origin != null && destination != null) ? (origin + " -> " + destination) : "Chưa xác định";
        this.departureTime = departureTime;

        // Nhận busType là Object và tự chuyển sang String để chống lỗi ép kiểu
        String busTypeStr = busType != null ? busType.toString() : "Loại xe ẩn";
        this.busInfo = (licensePlate != null) ? (licensePlate + " - " + busTypeStr) : "Chưa xếp xe";

        this.seatNumber = seatNumber != null ? seatNumber : "Chưa xếp";
        this.passengerName = passengerName != null ? passengerName : "Khách ẩn danh";
        this.passengerPhone = passengerPhone != null ? passengerPhone : "Chưa cập nhật";
        this.bookedAt = bookedAt;
        this.price = price;

        // Nhận status là Object và tự chuyển sang String
        this.status = status != null ? status.toString() : "BOOKED";

        this.pickupPoint = pickupPoint;
        this.dropoffPoint = dropoffPoint;
    }

    // --- BẮT BUỘC PHẢI CÓ GETTER VÀ SETTER Ở ĐÂY ---
    public Long getTicketId() { return ticketId; }
    public void setTicketId(Long ticketId) { this.ticketId = ticketId; }

    public String getRouteName() { return routeName; }
    public void setRouteName(String routeName) { this.routeName = routeName; }

    public LocalDateTime getDepartureTime() { return departureTime; }
    public void setDepartureTime(LocalDateTime departureTime) { this.departureTime = departureTime; }

    public String getBusInfo() { return busInfo; }
    public void setBusInfo(String busInfo) { this.busInfo = busInfo; }

    public String getSeatNumber() { return seatNumber; }
    public void setSeatNumber(String seatNumber) { this.seatNumber = seatNumber; }

    public String getPassengerName() { return passengerName; }
    public void setPassengerName(String passengerName) { this.passengerName = passengerName; }

    public String getPassengerPhone() { return passengerPhone; }
    public void setPassengerPhone(String passengerPhone) { this.passengerPhone = passengerPhone; }

    public LocalDateTime getBookedAt() { return bookedAt; }
    public void setBookedAt(LocalDateTime bookedAt) { this.bookedAt = bookedAt; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPickupPoint() { return pickupPoint; }
    public void setPickupPoint(String pickupPoint) { this.pickupPoint = pickupPoint; }

    public String getDropoffPoint() { return dropoffPoint; }
    public void setDropoffPoint(String dropoffPoint) { this.dropoffPoint = dropoffPoint; }
}
