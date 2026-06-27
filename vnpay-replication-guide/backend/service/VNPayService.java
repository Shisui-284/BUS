package com.yourapp.service;

import com.yourapp.config.VNPayConfig;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.text.SimpleDateFormat;
import java.util.*;

@Service
public class VNPayService {

    private final VNPayConfig config;

    public VNPayService(VNPayConfig config) {
        this.config = config;
    }

    public String createPaymentUrl(long amount, String orderId, String orderInfo,
                                    String ipAddress, String locale) {
        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", VNPayConfig.VERSION);
        params.put("vnp_Command", VNPayConfig.COMMAND);
        params.put("vnp_TmnCode", config.getVnpTmnCode());
        params.put("vnp_Amount", String.valueOf(amount * 100L));
        params.put("vnp_CurrCode", VNPayConfig.CURRENCY_CODE);
        params.put("vnp_TxnRef", orderId);
        params.put("vnp_OrderInfo", orderInfo);
        params.put("vnp_OrderType", VNPayConfig.ORDER_TYPE);

        String resolvedLocale = (locale != null && !locale.isEmpty()) ? locale : VNPayConfig.LOCALE_VN;
        params.put("vnp_Locale", "en".equals(resolvedLocale) ? VNPayConfig.LOCALE_EN : VNPayConfig.LOCALE_VN);

        params.put("vnp_ReturnUrl", config.getVnpReturnUrl());
        params.put("vnp_IpAddr", ipAddress);
        params.put("vnp_CreateDate", new SimpleDateFormat("yyyyMMddHHmmss").format(new Date()));

        String hashData = getHashData(params);
        String secureHash = hmacSHA512(config.getVnpHashSecret(), hashData);

        StringBuilder query = new StringBuilder();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (query.length() > 0) query.append("&");
            query.append(entry.getKey()).append("=").append(urlEncode(entry.getValue()));
        }

        return config.getVnpUrl() + "?" + query + "&vnp_SecureHash=" + secureHash;
    }

    private String getHashData(Map<String, String> params) {
        List<String> fieldNames = new ArrayList<>(params.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = params.get(fieldName);
            if (fieldValue != null && !fieldValue.isEmpty()) {
                hashData.append(fieldName).append("=").append(fieldValue);
                if (itr.hasNext()) hashData.append("&");
            }
        }
        return hashData.toString();
    }

    public String hmacSHA512(String key, String data) {
        try {
            Mac hmac512 = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            hmac512.init(secretKey);
            byte[] hash = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("Error generating HMAC-SHA512", e);
        }
    }

    public boolean verifyReturn(Map<String, String> params) {
        if (!params.containsKey("vnp_SecureHashType") || !params.containsKey("vnp_SecureHash")) {
            return false;
        }
        String providedHash = params.get("vnp_SecureHash");
        Map<String, String> paramsCopy = new TreeMap<>(params);
        paramsCopy.remove("vnp_SecureHashType");
        paramsCopy.remove("vnp_SecureHash");
        String hashData = getHashData(paramsCopy);
        String calculatedHash = hmacSHA512(config.getVnpHashSecret(), hashData);
        return calculatedHash.equalsIgnoreCase(providedHash);
    }

    public boolean verifyIpn(Map<String, String> params) {
        return verifyReturn(params);
    }

    public VNPayResponse parseResponse(Map<String, String> params) {
        VNPayResponse response = new VNPayResponse();
        response.setTxnRef(params.get("vnp_TxnRef"));
        response.setTransactionId(params.get("vnp_TransactionNo"));
        response.setResponseCode(params.get("vnp_ResponseCode"));
        response.setTransactionStatus(params.get("vnp_TransactionStatus"));
        response.setBankCode(params.get("vnp_BankCode"));
        response.setPayDate(params.get("vnp_PayDate"));
        try {
            String amtStr = params.get("vnp_Amount");
            if (amtStr != null) response.setAmount(Long.parseLong(amtStr) / 100L);
        } catch (NumberFormatException ignored) {}
        return response;
    }

    private String urlEncode(String value) {
        try {
            return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8.toString());
        } catch (UnsupportedEncodingException e) {
            return value;
        }
    }

    public static class VNPayResponse {
        private String txnRef;
        private String transactionId;
        private long amount;
        private String responseCode;
        private String transactionStatus;
        private String bankCode;
        private String payDate;

        public boolean isSuccess() {
            return "00".equals(responseCode) && "00".equals(transactionStatus);
        }

        public String getTxnRef() { return txnRef; }
        public void setTxnRef(String txnRef) { this.txnRef = txnRef; }
        public String getTransactionId() { return transactionId; }
        public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
        public long getAmount() { return amount; }
        public void setAmount(long amount) { this.amount = amount; }
        public String getResponseCode() { return responseCode; }
        public void setResponseCode(String responseCode) { this.responseCode = responseCode; }
        public String getTransactionStatus() { return transactionStatus; }
        public void setTransactionStatus(String transactionStatus) { this.transactionStatus = transactionStatus; }
        public String getBankCode() { return bankCode; }
        public void setBankCode(String bankCode) { this.bankCode = bankCode; }
        public String getPayDate() { return payDate; }
        public void setPayDate(String payDate) { this.payDate = payDate; }
    }
}
