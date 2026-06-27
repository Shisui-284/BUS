# test-vnpay-ipn.ps1
# Test IPN VNPay thủ công bằng PowerShell + .NET HttpClient.
# Mô phỏng VNPay gọi IPN với payload + hash đúng → kiểm tra backend xử lý.

param(
    [string]$BackendUrl = "http://localhost:8080",
    [string]$TmnCode = "SY273SZH",
    [string]$HashSecret = "SFP53JL1Z5AS4O5WFIEBMEARJAEMDTBT",
    [string]$TxnRef = "",
    [string]$Amount = "15000000",         # 150000 VND * 100
    [string]$ResponseCode = "00",         # 00 = success, 24 = cancel
    [string]$TransactionNo = "123456789",
    [string]$BankCode = "NCB",
    [string]$CardType = "ATM",
    [string]$OrderInfo = "Thanh toan ve xe #123"
)

# Auto-generate txn ref nếu chưa có
if ([string]::IsNullOrEmpty($TxnRef)) {
    $TxnRef = "TICKET_TEST_$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
}

$createDate = Get-Date -Format "yyyyMMddHHmmss"

# Build hash data theo thứ tự alphabet (giống VnpayUtil.buildHashData)
$hashParams = [ordered]@{
    "vnp_Amount"        = $Amount
    "vnp_BankCode"      = $BankCode
    "vnp_CardType"      = $CardType
    "vnp_Command"       = "pay"
    "vnp_CreateDate"    = $createDate
    "vnp_CurrCode"      = "VND"
    "vnp_IpAddr"        = "127.0.0.1"
    "vnp_Locale"        = "vn"
    "vnp_OrderInfo"     = $OrderInfo
    "vnp_OrderType"     = "other"
    "vnp_ResponseCode"  = $ResponseCode
    "vnp_TmnCode"       = $TmnCode
    "vnp_TransactionNo" = $TransactionNo
    "vnp_TxnRef"        = $TxnRef
}

$hashData = ($hashParams.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"

# Tính HMAC-SHA512
$hmac = [System.Security.Cryptography.HMACSHA512]::new([Text.Encoding]::UTF8.GetBytes($HashSecret))
$hashBytes = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($hashData))
$secureHash = -join ($hashBytes | ForEach-Object { $_.ToString("x2") })

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Test VNPay IPN" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Backend URL : $BackendUrl/api/public/payment/vnpay/ipn"
Write-Host "TxnRef      : $TxnRef"
Write-Host "Amount      : $Amount (= $([int]$Amount / 100) VND)"
Write-Host "ResponseCode: $ResponseCode"
Write-Host "SecureHash  : $secureHash"
Write-Host "HashData    : $hashData"
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Build form-urlencoded body
$body = @(
    "vnp_Amount=$Amount",
    "vnp_BankCode=$BankCode",
    "vnp_CardType=$CardType",
    "vnp_Command=pay",
    "vnp_CreateDate=$createDate",
    "vnp_CurrCode=VND",
    "vnp_IpAddr=127.0.0.1",
    "vnp_Locale=vn",
    "vnp_OrderInfo=$OrderInfo",
    "vnp_OrderType=other",
    "vnp_ResponseCode=$ResponseCode",
    "vnp_TmnCode=$TmnCode",
    "vnp_TransactionNo=$TransactionNo",
    "vnp_TxnRef=$TxnRef",
    "vnp_SecureHashType=HmacSHA512",
    "vnp_SecureHash=$secureHash"
) -join "&"

# Gọi IPN
try {
    $response = Invoke-WebRequest `
        -Uri "$BackendUrl/api/public/payment/vnpay/ipn" `
        -Method POST `
        -ContentType "application/x-www-form-urlencoded" `
        -Body $body `
        -UseBasicParsing

    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Body  : $($response.Content)" -ForegroundColor Green
    Write-Host ""
    if ($response.Content -match '"RspCode":"00"') {
        Write-Host "[OK] Backend xử lý IPN thành công!" -ForegroundColor Green
    } elseif ($response.Content -match '"RspCode":"97"') {
        Write-Host "[FAIL] Sai checksum (97)" -ForegroundColor Red
    } elseif ($response.Content -match '"RspCode":"02"') {
        Write-Host "[FAIL] Sai TmnCode (02)" -ForegroundColor Red
    } elseif ($response.Content -match '"RspCode":"01"') {
        Write-Host "[FAIL] Không tìm thấy payment (01)" -ForegroundColor Red
    } elseif ($response.Content -match '"RspCode":"04"') {
        Write-Host "[FAIL] Sai amount (04)" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        Write-Host "Body: $($reader.ReadToEnd())" -ForegroundColor Red
    }
}