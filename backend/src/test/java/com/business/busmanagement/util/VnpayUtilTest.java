package com.business.busmanagement.util;

import com.business.busmanagement.config.VnpayConfig;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TreeMap;

import static org.assertj.core.api.Assertions.assertThat;

class VnpayUtilTest {

    /**
     * Test 1: Empty optional params bị loại bỏ khỏi cả hashData lẫn paymentUrl.
     *
     * Theo code mẫu VNPay: cả hash data lẫn URL query đều dùng URL-encoded value.
     * Khi VNPay verify, server parse URL rồi rebuild hash với encoded values.
     */
    @Test
    void shouldOmitEmptyParametersFromHashDataAndPaymentUrl() {
        VnpayConfig config = new VnpayConfig();
        config.setHashSecret("SFP53JL1Z5AS4O5WFIEBMEARJAEMDTBT");
        config.setUrl("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html");

        Map<String, String> params = new LinkedHashMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", "SY273SZH");
        params.put("vnp_Amount", "1000000");
        params.put("vnp_BankCode", "");            // empty -> phải bị bỏ
        params.put("vnp_OrderInfo", "Thanh toan ve xe");

        // hashData dùng URL-encoded value (đúng spec VNPay).
        String hashData = VnpayUtil.buildHashData(params);
        assertThat(hashData)
                .contains("vnp_Amount=1000000")
                .contains("vnp_OrderInfo=Thanh%20toan%20ve%20xe")
                .doesNotContain("vnp_BankCode");

        // Payment URL cũng dùng URL-encoded value - đúng chuẩn VNPay.
        String paymentUrl = VnpayUtil.buildPaymentUrl(config, params);
        assertThat(paymentUrl)
                .contains("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?")
                .contains("vnp_Amount=1000000")
                .contains("vnp_OrderInfo=Thanh%20toan%20ve%20xe")
                .doesNotContain("vnp_BankCode=");
    }

    /**
     * Test 2: Hash data và query string trên URL dùng cùng URL-encoded value.
     *
     * Mô phỏng VNPay verify:
     *   1. VNPay nhận URL (hoặc browser gửi request)
     *   2. HTTP client/parser decode values
     *   3. VNPay build hashData từ decoded values (sẽ re-encode)
     *   4. Sort key, nối thành signData, HMAC-SHA512 và so sánh
     *
     * → Cả create (buildPaymentUrl) và verify phải dùng cùng URL-encoded value.
     */
    @Test
    void hashDataAndQueryMustUseSameRawValues() {
        VnpayConfig config = new VnpayConfig();
        config.setHashSecret("SFP53JL1Z5AS4O5WFIEBMEARJAEMDTBT");
        config.setUrl("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html");

        Map<String, String> params = new LinkedHashMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", "SY273SZH");
        params.put("vnp_Amount", "15000000");
        params.put("vnp_OrderInfo", "Thanh toan ve xe #123");

        String sentHashData = VnpayUtil.buildHashData(params);
        String sentHash = VnpayUtil.hmacSHA512(config.getHashSecret(), sentHashData);
        String paymentUrl = VnpayUtil.buildPaymentUrl(config, params);

        // Cắt query string (trước &vnp_SecureHashType)
        int secureHashTypeIdx = paymentUrl.indexOf("&vnp_SecureHashType=");
        String query = paymentUrl.substring(paymentUrl.indexOf('?') + 1, secureHashTypeIdx);

        // Mô phỏng VNPay verify (hoặc browser gửi Return URL request):
        // 1. HTTP client đã URL-decode values khi gửi request
        // 2. VNPay nhận decoded values -> build hashData với encoded value
        Map<String, String> reExtracted = new TreeMap<>();
        for (String pair : query.split("&")) {
            int eq = pair.indexOf('=');
            if (eq > 0) {
                String key = pair.substring(0, eq);
                String encodedValue = pair.substring(eq + 1);
                // Giả lập HTTP client đã decode, nhưng buildHashData sẽ re-encode
                reExtracted.put(key, VnpayUtil.urlDecode(encodedValue));
            }
        }
        String reHashedData = VnpayUtil.buildHashData(reExtracted);
        String reHashed = VnpayUtil.hmacSHA512(config.getHashSecret(), reHashedData);

        assertThat(reHashedData).isEqualTo(sentHashData);
        assertThat(reHashed).isEqualTo(sentHash);
    }

    /**
     * Test 3: Verify với ký tự đặc biệt - thực tế từ Return URL/IPN.
     *
     * Params từ Return URL đã được decode, verifySecureHash sẽ
     * build lại hashData với re-encoded value -> phải khớp.
     */
    @Test
    void verifySecureHashWithSpecialCharacters() {
        String secret = "SFP53JL1Z5AS4O5WFIEBMEARJAEMDTBT";

        Map<String, String> rawParams = new LinkedHashMap<>();
        rawParams.put("vnp_Amount", "15000000");
        rawParams.put("vnp_Command", "pay");
        rawParams.put("vnp_CreateDate", "20260626093000");
        rawParams.put("vnp_CurrCode", "VND");
        rawParams.put("vnp_IpAddr", "127.0.0.1");
        rawParams.put("vnp_Locale", "vn");
        rawParams.put("vnp_OrderInfo", "Thanh toan ve xe #123");
        rawParams.put("vnp_OrderType", "other");
        rawParams.put("vnp_ReturnUrl", "http://localhost:4173/payment/vnpay-return");
        rawParams.put("vnp_TmnCode", "SY273SZH");
        rawParams.put("vnp_TxnRef", "TICKET1_1700000000");
        rawParams.put("vnp_Version", "2.1.0");

        String expectedHash = VnpayUtil.hmacSHA512(secret, VnpayUtil.buildHashData(rawParams));

        assertThat(VnpayUtil.verifySecureHash(rawParams, expectedHash, secret)).isTrue();
    }

    /**
     * Test 4: Verify với secureHash sai -> return false (không được throw exception).
     */
    @Test
    void verifySecureHashReturnsFalseOnMismatch() {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("vnp_Amount", "15000000");
        params.put("vnp_TmnCode", "SY273SZH");

        assertThat(VnpayUtil.verifySecureHash(params, "wronghash", "secret")).isFalse();
        assertThat(VnpayUtil.verifySecureHash(params, null, "secret")).isFalse();
        assertThat(VnpayUtil.verifySecureHash(params, "", "secret")).isFalse();
    }

    /**
     * Test 5: Verify với vnp_SecureHash / vnp_SecureHashType trong params - phải tự loại bỏ.
     */
    @Test
    void verifySecureHashRemovesSecureHashFields() {
        String secret = "SFP53JL1Z5AS4O5WFIEBMEARJAEMDTBT";
        Map<String, String> paramsWithoutSecure = new LinkedHashMap<>();
        paramsWithoutSecure.put("vnp_Amount", "15000000");
        paramsWithoutSecure.put("vnp_TmnCode", "SY273SZH");
        String expectedHash = VnpayUtil.hmacSHA512(secret, VnpayUtil.buildHashData(paramsWithoutSecure));

        // Thêm 2 field SecureHash vào - verify vẫn phải pass vì tự loại bỏ
        Map<String, String> paramsWithSecure = new LinkedHashMap<>(paramsWithoutSecure);
        paramsWithSecure.put("vnp_SecureHashType", "HmacSHA512");
        paramsWithSecure.put("vnp_SecureHash", expectedHash);

        assertThat(VnpayUtil.verifySecureHash(paramsWithSecure, expectedHash, secret)).isTrue();
    }
}
