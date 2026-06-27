# test-vnpay-ipn.sh
# Script test IPN VNPay thủ công bằng curl (không cần thanh toán thật).
# Mô phỏng VNPay gọi IPN URL với payload + hash đúng → kiểm tra backend xử lý.

set -e

# === CẤU HÌNH ===
BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
TMN_CODE="${VNPAY_TMN_CODE:-SY273SZH}"
HASH_SECRET="${VNPAY_HASH_SECRET:-SFP53JL1Z5AS4O5WFIEBMEARJAEMDTBT}"

# === PARAMS MẪU ===
TXN_REF="${TXN_REF:-TICKET_TEST_$(date +%s)}"
AMOUNT="${AMOUNT:-15000000}"           # 150000 VND * 100
RESPONSE_CODE="${RESPONSE_CODE:-00}"   # 00 = success, 24 = cancel
TRANSACTION_NO="${TRANSACTION_NO:-123456789}"
BANK_CODE="${BANK_CODE:-NCB}"
CARD_TYPE="${CARD_TYPE:-ATM}"
ORDER_INFO="${ORDER_INFO:-Thanh toan ve xe #123}"
CREATE_DATE="${CREATE_DATE:-$(date +%Y%m%d%H%M%S)}"

# === BUILD HASH DATA ===
# Thứ tự alphabet: vnp_Amount, vnp_BankCode, vnp_CardType, vnp_Command,
# vnp_CreateDate, vnp_CurrCode, vnp_IpAddr, vnp_Locale, vnp_OrderInfo,
# vnp_OrderType, vnp_ResponseCode, vnp_TmnCode, vnp_TransactionNo, vnp_TxnRef
HASH_DATA="vnp_Amount=${AMOUNT}&vnp_BankCode=${BANK_CODE}&vnp_CardType=${CARD_TYPE}&vnp_Command=pay&vnp_CreateDate=${CREATE_DATE}&vnp_CurrCode=VND&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=${ORDER_INFO}&vnp_OrderType=other&vnp_ResponseCode=${RESPONSE_CODE}&vnp_TmnCode=${TMN_CODE}&vnp_TransactionNo=${TRANSACTION_NO}&vnp_TxnRef=${TXN_REF}"

# === KÝ HASH ===
SECURE_HASH=$(echo -n "$HASH_DATA" | openssl dgst -sha512 -hmac "$HASH_SECRET" -hex | awk '{print $2}')

echo "============================================================"
echo "  Test VNPay IPN"
echo "============================================================"
echo "Backend URL : $BACKEND_URL/api/public/payment/vnpay/ipn"
echo "TxnRef      : $TXN_REF"
echo "Amount      : $AMOUNT (= $(($AMOUNT / 100)) VND)"
echo "ResponseCode: $RESPONSE_CODE"
echo "SecureHash  : $SECURE_HASH"
echo "HashData    : $HASH_DATA"
echo "============================================================"
echo ""

# === GỌI IPN ===
curl -v -X POST "$BACKEND_URL/api/public/payment/vnpay/ipn" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "vnp_Amount=$AMOUNT" \
  --data-urlencode "vnp_BankCode=$BANK_CODE" \
  --data-urlencode "vnp_CardType=$CARD_TYPE" \
  --data-urlencode "vnp_Command=pay" \
  --data-urlencode "vnp_CreateDate=$CREATE_DATE" \
  --data-urlencode "vnp_CurrCode=VND" \
  --data-urlencode "vnp_IpAddr=127.0.0.1" \
  --data-urlencode "vnp_Locale=vn" \
  --data-urlencode "vnp_OrderInfo=$ORDER_INFO" \
  --data-urlencode "vnp_OrderType=other" \
  --data-urlencode "vnp_ResponseCode=$RESPONSE_CODE" \
  --data-urlencode "vnp_TmnCode=$TMN_CODE" \
  --data-urlencode "vnp_TransactionNo=$TRANSACTION_NO" \
  --data-urlencode "vnp_TxnRef=$TXN_REF" \
  --data-urlencode "vnp_SecureHashType=HmacSHA512" \
  --data-urlencode "vnp_SecureHash=$SECURE_HASH"

echo ""
echo "============================================================"