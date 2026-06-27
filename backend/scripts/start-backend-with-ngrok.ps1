# start-backend-with-ngrok.ps1
# Script khởi động backend Spring Boot với IPN URL trỏ về ngrok.
#
# BƯỚC 1: Chạy ngrok trước
#   > ngrok http 8080
# BƯỚC 2: Copy URL Forwarding (ví dụ https://abc123.ngrok-free.app)
# BƯỚC 3: Set biến dưới đây và chạy script này

param(
    [Parameter(Mandatory = $true)]
    [string]$NgrokUrl
)

# Validate URL
if (-not $NgrokUrl.StartsWith("https://")) {
    Write-Host "❌ URL phải bắt đầu bằng https://" -ForegroundColor Red
    exit 1
}

# Strip trailing slash
$NgrokUrl = $NgrokUrl.TrimEnd('/')
$ipnUrl = "$NgrokUrl/api/public/payment/vnpay/ipn"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Khởi động backend với IPN URL:" -ForegroundColor Cyan
Write-Host "  $ipnUrl" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Nhớ paste URL này vào dashboard VNPay sandbox:" -ForegroundColor Magenta
Write-Host "   https://sandbox.vnpayment.vn → Cấu hình IPN" -ForegroundColor Magenta
Write-Host ""

# Set env vars
$env:VNPAY_IPN_URL = $ipnUrl

# Optional: override nếu muốn
# $env:VNPAY_RETURN_URL = "$NgrokUrl/payment/vnpay-return"
# $env:VNPAY_TMN_CODE = "SY273SZH"
# $env:VNPAY_HASH_SECRET = "SFP53JL1Z5AS4O5WFIEBMEARJAEMDTBT"

# Khởi động backend
Set-Location -LiteralPath (Join-Path $PSScriptRoot "..")
./mvnw spring-boot:run