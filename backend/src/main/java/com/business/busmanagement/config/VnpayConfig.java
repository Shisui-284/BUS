package com.business.busmanagement.config;

/* ============================================================
 * Bind config từ application.properties prefix "app.vnpay"
 * Có thể override bằng env var: VNPAY_TMN_CODE, VNPAY_HASH_SECRET, ...
 * ============================================================ */

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

/**
 * Cấu hình VNPay được load từ application.properties với prefix {@code app.vnpay}.
 * Cho phép thay đổi secret/URL qua biến môi trường mà không cần sửa code.
 */
@Data
@Configuration
@Validated
@ConfigurationProperties(prefix = "app.vnpay")
public class VnpayConfig {

    /** Mã website (vnp_TmnCode) do VNPay cấp */
    @NotBlank
    private String tmnCode;

    /** Chuỗi bí mật để tạo và xác thực checksum (vnp_HashSecret) */
    @NotBlank
    private String hashSecret;

    /** URL thanh toán của cổng VNPay (sandbox hoặc production) */
    @NotBlank
    private String url;

    /** URL frontend sẽ được redirect về sau khi user thanh toán xong */
    private String returnUrl;

    /** URL API của VNPay dùng cho truy vấn giao dịch (refund, query...) */
    private String apiUrl;

    /** URL mà VNPay gọi server-to-server để thông báo kết quả thanh toán */
    private String ipnUrl;

    private String version = "2.1.0";
    private String command = "pay";
    private String orderType = "other";
    private String locale = "vn";
    private String currencyCode = "VND";

    /** Thời gian URL thanh toán hết hạn (phút) */
    private int expireMinutes = 15;
}