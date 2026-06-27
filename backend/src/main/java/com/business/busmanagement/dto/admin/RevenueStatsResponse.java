package com.business.busmanagement.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Thống kê doanh thu cho admin.
 *
 * Quy tắc nghiệp vụ (theo yêu cầu của admin):
 *  - Chỉ những vé đã được admin "xác nhận" (CONFIRMED + đã có paidAt)
 *    hoặc vé đã thanh toán tự động qua VNPay/COD (PAID) mới được tính doanh thu.
 *  - Vé đang HOLD (chờ xác nhận) và vé CANCELLED/REFUNDED/EXPIRED/BOOKED
 *    đều KHÔNG tính vào doanh thu.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RevenueStatsResponse {

    /** Tổng doanh thu tính tới thời điểm hiện tại (tất cả vé đã chốt). */
    private BigDecimal totalRevenue;

    /** Doanh thu 7 ngày gần nhất, mỗi phần tử = 1 ngày. */
    private List<DailyRevenue> dailyRevenue;

    /** Doanh thu theo tuần (12 tuần gần nhất). */
    private List<WeeklyRevenue> weeklyRevenue;

    /** Doanh thu theo tháng (12 tháng gần nhất). */
    private List<MonthlyRevenue> monthlyRevenue;

    /** Doanh thu theo năm (5 năm gần nhất). */
    private List<YearlyRevenue> yearlyRevenue;

    /** Top xe chạy nhiều nhất (theo số chuyến và doanh thu). */
    private List<TopBusRevenue> topBuses;

    /** Top tài xế chạy nhiều nhất (theo số chuyến được phân công). */
    private List<TopDriverRevenue> topDrivers;

    /** Tổng số vé đã được admin chốt doanh thu. */
    private long confirmedTicketCount;

    /** Tổng số vé đang chờ xác nhận (HOLD) — không tính doanh thu. */
    private long pendingTicketCount;

    /** Tổng số vé đã hủy. */
    private long cancelledTicketCount;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyRevenue {
        private String date;       // YYYY-MM-DD
        private String label;      // VD: "27/06"
        private BigDecimal amount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeeklyRevenue {
        private String weekStart;  // YYYY-MM-DD (thứ 2)
        private String label;      // VD: "Tuần 26"
        private BigDecimal amount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyRevenue {
        private String month;      // YYYY-MM
        private String label;      // VD: "T06/2026"
        private BigDecimal amount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class YearlyRevenue {
        private String year;       // YYYY
        private String label;      // VD: "2026"
        private BigDecimal amount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopBusRevenue {
        private Long busId;
        private String licensePlate;
        private String busType;
        private long tripCount;
        private long ticketCount;
        private BigDecimal revenue;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopDriverRevenue {
        private Long employeeId;
        private String fullName;
        private long tripCount;
        private long ticketCount;
        private BigDecimal revenue;
    }
}
