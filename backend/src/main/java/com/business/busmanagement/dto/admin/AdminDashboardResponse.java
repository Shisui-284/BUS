package com.business.busmanagement.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardResponse {

    private long totalUsers;
    private long totalBuses;
    private long totalRoutes;
    private long todayTrips;

    private List<RoleCount> roleDistribution;
    private List<BusStatusCount> busStatusDistribution;
    private List<BusInsuranceAlert> insuranceAlerts;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoleCount {
        private String role;
        private long count;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BusStatusCount {
        private String status;
        private long count;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BusInsuranceAlert {
        private Long busId;
        private String licensePlate;
        private String busType;
        private String status;
        private String expiryDate;
        private String alertType;
    }
}
