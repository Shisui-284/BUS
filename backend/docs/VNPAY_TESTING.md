# Hướng dẫn test tích hợp VNPay Sandbox

> **Vấn đề thường gặp nhất:** IPN URL trỏ về `localhost` → VNPay server không gọi được → vé không bao giờ được update thành PAID.

---

## 1. Tại sao phải dùng ngrok?

VNPay sandbox là server bên ngoài (`sandbox.vnpayment.vn`). Khi user thanh toán xong, VNPay cần gọi **IPN callback** tới backend của bạn qua internet công cộng. Nếu `app.vnpay.ipn-url` trỏ về `http://localhost:8080/...` thì VNPay sandbox không thể kết nối được.

**Giải pháp:** dùng [ngrok](https://ngrok.com) để tạo URL public tạm thời trỏ về `localhost:8080`.

---

## 2. Các bước thực hiện

### Bước 1: Cài đặt ngrok

Tải tại https://ngrok.com/download, hoặc qua npm:
```bash
npm install -g ngrok
```

Đăng ký tài khoản miễn phí và lấy authtoken:
```bash
ngrok config add-authtoken <YOUR_TOKEN>
```

### Bước 2: Khởi động backend Spring Boot

```bash
cd backend
./mvnw spring-boot:run
```

Đảm bảo backend chạy ở `http://localhost:8080`.

### Bước 3: Chạy ngrok

Mở terminal mới:
```bash
ngrok http 8080
```

Kết quả sẽ có dạng:
```
Session Status   online
Forwarding       https://abc123xyz.ngrok-free.app → http://localhost:8080
```

Copy URL Forwarding (ví dụ `https://abc123xyz.ngrok-free.app`).

### Bước 4: Cấu hình IPN URL

Tạm thời set biến môi trường trước khi chạy backend:

**Windows (PowerShell):**
```powershell
$env:VNPAY_IPN_URL="https://abc123xyz.ngrok-free.app/api/public/payment/vnpay/ipn"
cd backend
./mvnw spring-boot:run
```

**Hoặc** sửa trực tiếp `application.properties`:
```properties
app.vnpay.ipn-url=https://abc123xyz.ngrok-free.app/api/public/payment/vnpay/ipn
```

### Bước 5: Đăng ký IPN URL với VNPay sandbox

1. Truy cập: https://sandbox.vnpayment.vn
2. Đăng nhập merchant test.
3. Vào **Quản lý IPN URL** / **Cấu hình URL**: paste URL ở bước 4.

> Mỗi lần restart ngrok, URL sẽ đổi (trừ khi dùng tài khoản trả phí có subdomain cố định). Bạn phải cập nhật IPN URL trên VNPay mỗi lần.

### Bước 6: Test end-to-end

1. **Login CUSTOMER**, book 1 vé (status HOLD).
2. Gọi API tạo URL thanh toán:
   ```
   POST http://localhost:8080/api/private/payment/vnpay/create
   Authorization: Bearer <jwt-token>
   Content-Type: application/json

   { "ticketId": 123 }
   ```
3. Server trả về:
   ```json
   { "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=...", "txnRef": "TICKET123_..." }
   ```
4. Mở `paymentUrl` trong trình duyệt → thanh toán với thẻ sandbox test.
5. Thẻ test VNPay sandbox:
   - Số thẻ: `9704198526191432198`
   - Tên chủ thẻ: `NGUYEN VAN A`
   - Ngày phát hành: `07/15`
   - Mã OTP: `123456`
6. Sau khi thanh toán, VNPay redirect về `app.vnpay.return-url` (frontend của bạn).
7. VNPay **đồng thời** gọi IPN tới `https://abc123xyz.ngrok-free.app/api/public/payment/vnpay/ipn` → backend xử lý, cập nhật `Payment.status=SUCCESS` và `Ticket.status=PAID`.

---

## 3. Kiểm tra nhanh log IPN

Trong terminal chạy backend, khi IPN đến bạn sẽ thấy:
```
INFO  - VNPay IPN received: txnRef=TICKET123_... responseCode=00 amount=15000000 bankCode=NCB tmnCode=SY273SZH
INFO  - VNPay payment SUCCESS for ticket #123 txnRef=TICKET123_...
```

Nếu hash sai, log sẽ hiện chi tiết:
```
WARN  - VNPay IPN invalid checksum for txnRef=...
WARN  -   received secureHash  = abc...
WARN  -   recomputed           = xyz...
WARN  -   hashData (signed)    = vnp_Amount=15000000&vnp_Command=pay&...
WARN  -   verifyParams (sorted) = {vnp_Amount=15000000, ...}
WARN  -   hashSecret (first 4) = SFP5...
```

So sánh `received` và `recomputed` để tìm nguyên nhân.

---

## 4. Test thủ công IPN (không cần thanh toán thật)

Dùng tool **Test IPN** trên dashboard VNPay sandbox — cho phép gọi IPN URL với payload mẫu. Hoặc dùng `curl` mô phỏng VNPay:

```bash
# Tính hash đúng
HASH_DATA="vnp_Amount=15000000&vnp_Command=pay&vnp_CreateDate=20260626110000&vnp_CurrCode=VND&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Test&vnp_OrderType=other&vnp_TmnCode=SY273SZH&vnp_TxnRef=TICKET_TEST"
SECURE_HASH=$(echo -n "$HASH_DATA" | openssl dgst -sha512 -hmac "SFP53JL1Z5AS4O5WFIEBMEARJAEMDTBT" -hex | awk '{print $2}')

# Gọi IPN
curl -X POST "http://localhost:8080/api/public/payment/vnpay/ipn" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "vnp_TmnCode=SY273SZH" \
  --data-urlencode "vnp_Amount=15000000" \
  --data-urlencode "vnp_Command=pay" \
  --data-urlencode "vnp_CreateDate=20260626110000" \
  --data-urlencode "vnp_CurrCode=VND" \
  --data-urlencode "vnp_IpAddr=127.0.0.1" \
  --data-urlencode "vnp_Locale=vn" \
  --data-urlencode "vnp_OrderInfo=Test" \
  --data-urlencode "vnp_OrderType=other" \
  --data-urlencode "vnp_TxnRef=TICKET_TEST" \
  --data-urlencode "vnp_ResponseCode=00" \
  --data-urlencode "vnp_SecureHashType=HmacSHA512" \
  --data-urlencode "vnp_SecureHash=$SECURE_HASH"
```

---

## 5. Troubleshooting

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| `RspCode: 97 Invalid signature` | Hash không khớp | Xem log chi tiết, kiểm tra `hashSecret` đúng với VNPay merchant |
| `RspCode: 02 Invalid TmnCode` | `vnp_TmnCode` không khớp config | Kiểm tra `app.vnpay.tmn-code` |
| IPN không được gọi | URL là localhost | Dùng ngrok + set `VNPAY_IPN_URL` env |
| IPN chậm 5-10 phút | VNPay sandbox chậm | Bình thường, đợi hoặc test thủ công |
| `RspCode: 04 Invalid amount` | Số tiền IPN khác giá vé × 100 | Kiểm tra `ticket.getPrice()` |
| `RspCode: 01 Order not found` | `vnp_TxnRef` không match DB | User retry tạo URL mới → IPN của URL cũ vẫn đến |
| Frontend không nhận CORS | Port frontend không trong whitelist | Thêm port vào `app.cors.allowed-origins` |

---

## 6. Production checklist

Khi chuyển sang production:
- [ ] Đăng ký merchant tại https://vnpay.vn
- [ ] Lấy `tmnCode` + `hashSecret` production (KHÁC sandbox)
- [ ] Đổi `app.vnpay.url` → `https://pay.vnpay.vn/vpcpay.html`
- [ ] IPN URL phải là HTTPS public
- [ ] Không commit `hashSecret` vào git — dùng env var
- [ ] Thêm rate-limit cho endpoint IPN
- [ ] Monitor log IPN để phát hiện giao dịch bất thường