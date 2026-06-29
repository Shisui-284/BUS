package com.business.busmanagement.util;

/* ============================================================
 * Tiện ích ký + verify checksum VNPay theo HMAC-SHA512.
 * Quy tắc VNPay:
 *   1. Sort params theo key tăng dần (alphabet)
 *   2. Bỏ params rỗng + 2 key đặc biệt: vnp_SecureHash, vnp_SecureHashType
 *   3. Build chuỗi "key1=value1&key2=value2" (value URL-encoded)
 *   4. Ký HMAC-SHA512 với secret
 * ============================================================ */

import com.business.busmanagement.config.VnpayConfig;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.*;

/**
 * Tiện ích ký và xác thực checksum VNPay theo chuẩn HMAC-SHA512.
 * <p>
 * Quy tắc VNPay:
 * <ol>
 *   <li>Sắp xếp các tham số theo key tăng dần (alphabet)</li>
 *   <li>Loại bỏ tham số rỗng và 2 key đặc biệt: vnp_SecureHash, vnp_SecureHashType</li>
 *   <li>Build chuỗi {@code key1=value1&key2=value2} với value đã URL-encode (cho cả hash data lẫn URL)</li>
 *   <li>Ký HMAC-SHA512 với secret key</li>
 * </ol>
 * Lưu ý: Cả hash data lẫn query URL đều dùng URL-encoded value.
 * VNPay verify bằng cách parse URL, sort key, nối lại chuỗi với encoded values rồi hash.
 * Tham khảo: <a href="https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html">Tài liệu VNPay</a>
 */
public final class VnpayUtil {

    private VnpayUtil() {
        // Utility class
    }

    /**
     * Ký HMAC-SHA512 cho chuỗi dữ liệu bằng secret key.
     */
    public static String hmacSHA512(String secretKey, String data) {
        try {
            Mac hmac = Mac.getInstance("HmacSHA512");
            hmac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] hashBytes = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hashBytes.length * 2);
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("Error generating HMAC-SHA512", e);
        }
    }

    /**
     * URL-encode theo chuẩn VNPay (form-urlencoded, dùng UTF-8).
     *
     * LƯU QUAN TRỌNG: KHÔNG replace '+' thành '%20' như Java URLEncoder mặc định.
     *
     * Java URLEncoder.encode("Thanh toan") = "Thanh+toan"
     * Nếu thay + → %20 sẽ thành "Thanh%20toan" — sai khác biệt hash so với VNPay.
     *
     * VNPay sandbox docs dùng query string encoding chuẩn form-urlencoded
     * (giữ '+' cho space), KHÔNG dùng path-segment encoding (dùng %20 cho space).
     *
     * Tham khảo: https://sandbox.vnpayment.vn/apis/downloads/ code mẫu Java của VNPay
     * cũng dùng URLEncoder.encode() trực tiếp KHÔNG replace +.
     */
    public static String urlEncode(String value) {
        if (value == null) return "";
        try {
            return URLEncoder.encode(value, StandardCharsets.UTF_8.toString());
        } catch (UnsupportedEncodingException e) {
            return value;
        }
    }

    /**
     * URL-decode theo chuẩn VNPay (form-urlencoded, dùng UTF-8).
     * Reverse của {@link #urlEncode(String)}.
     *
     * Do {@link #urlEncode} giữ '+' cho space, decode chỉ cần URLDecoder.decode thẳng.
     */
    public static String urlDecode(String value) {
        if (value == null) return "";
        try {
            return java.net.URLDecoder.decode(value, StandardCharsets.UTF_8.toString());
        } catch (UnsupportedEncodingException e) {
            return value;
        }
    }

    /**
     * Build chuỗi hash data từ map các tham số RAW.
     *
     * QUY TẮC — Theo code mẫu chính thức VNPay:
     * https://sandbox.vnpayment.vn/apis/downloads/
     *
     * 1. Sắp xếp key theo alphabet tăng dần
     * 2. Chỉ giữ lại params có value không rỗng (không null, không "")
     * 3. NỐI VALUE ĐÃ URL-ENCODE - đúng theo cách VNPay verify
     *    (VNPay parse URL rồi rebuild chuỗi với ENCODED value)
     *
     * Hash data = "key1=urlencoded(value1)&key2=urlencoded(value2)&..."
     *
     * @param params map các tham số RAW (KHÔNG bao gồm vnp_SecureHash*)
     * @return chuỗi hash data định dạng key1=value1&key2=value2 (URL-encoded value)
     */
    public static String buildHashData(Map<String, String> params) {
        List<String> fieldNames = new ArrayList<>(params.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = params.get(fieldName);
            if (shouldIncludeParam(fieldValue)) {
                if (hashData.length() > 0) {
                    hashData.append('&');
                }
                hashData.append(fieldName).append('=').append(urlEncode(fieldValue));
            }
        }
        return hashData.toString();
    }

    /**
     * Build URL thanh toán đầy đủ kèm vnp_SecureHash để redirect user sang VNPay.
     *
     * Theo code mẫu chính thức VNPay: cả hash data và query URL đều dùng
     * URL-encoded value. VNPay server parse URL, sort key, nối lại đúng chuỗi
     * hashData (với encoded value) và verify hash.
     */
    public static String buildPaymentUrl(VnpayConfig config, Map<String, String> params) {
        String hashData = buildHashData(params);
        String secureHash = hmacSHA512(config.getHashSecret(), hashData);

        StringBuilder query = new StringBuilder();
        Iterator<Map.Entry<String, String>> itr = new TreeMap<>(params).entrySet().iterator();
        while (itr.hasNext()) {
            Map.Entry<String, String> entry = itr.next();
            if (!shouldIncludeParam(entry.getValue())) {
                continue;
            }
            if (query.length() > 0) query.append("&");
            // URL-encode value cho cả query string và hash data.
            query.append(entry.getKey()).append('=').append(urlEncode(entry.getValue()));
        }

        return config.getUrl() + "?" + query
                + "&vnp_SecureHashType=HmacSHA512"
                + "&vnp_SecureHash=" + secureHash;
    }

    /**
     * Xác thực checksum từ IPN callback hoặc Return URL.
     * Trả về true nếu secure hash khớp (chữ ký hợp lệ).
     *
     * <p>VNPay IPN/Return URL trả về params với value RAW (qs.parse với decode:false).
     * Ta build lại hashData bằng cùng logic {@link #buildHashData(Map)} và so khớp.
     *
     * @param params     các tham số VNPay trả về (RAW — KHÔNG bao gồm vnp_SecureHash*)
     * @param secureHash chữ ký VNPay gửi kèm (vnp_SecureHash)
     * @param hashSecret secret key của merchant
     */
    public static boolean verifySecureHash(Map<String, String> params, String secureHash, String hashSecret) {
        if (secureHash == null || secureHash.isEmpty()) return false;

        // Loại bỏ vnp_SecureHash / vnp_SecureHashType để an toàn
        Map<String, String> hashParams = new HashMap<>(params);
        hashParams.remove("vnp_SecureHash");
        hashParams.remove("vnp_SecureHashType");

        String hashData = buildHashData(hashParams);
        String expected = hmacSHA512(hashSecret, hashData);
        return expected.equalsIgnoreCase(secureHash);
    }

    /**
     * Lấy IP thực của client từ request (ưu tiên X-Forwarded-For nếu có proxy).
     */
    public static String getClientIp(jakarta.servlet.http.HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isBlank()) {
            int commaIdx = ip.indexOf(',');
            return commaIdx > 0 ? ip.substring(0, commaIdx).trim() : ip.trim();
        }
        ip = request.getHeader("X-Real-IP");
        if (ip != null && !ip.isBlank()) return ip.trim();
        return request.getRemoteAddr();
    }

    private static boolean shouldIncludeParam(String value) {
        return value != null && !value.isEmpty();
    }
}
