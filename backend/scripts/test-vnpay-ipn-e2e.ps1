$ErrorActionPreference = "Continue"
$BackendUrl = "http://localhost:8080"
$TmnCode = "SY273SZH"
$HashSecret = "SFP53JL1Z5AS4O5WFIEBMEARJAEMDTBT"

function Get-TicketById($token, $id) {
    $h = @{ "Authorization" = "Bearer $token" }
    try {
        $all = Invoke-RestMethod -Uri "$BackendUrl/api/private/tickets/my" -Method GET -Headers $h
        return $all | Where-Object { $_.id -eq $id } | Select-Object -First 1
    } catch { return $null }
}

function Build-VnpayHash($params, $secret) {
    $keys = @($params.Keys) | Sort-Object
    $dataParts = @()
    foreach ($key in $keys) {
        # URL-encode value trước khi build hash data - đúng spec VNPay
        $encodedValue = [System.Web.HttpUtility]::UrlEncode($params[$key])
        $dataParts += "$key=$encodedValue"
    }
    $data = $dataParts -join "&"
    $hmac = [System.Security.Cryptography.HMACSHA512]::new([Text.Encoding]::UTF8.GetBytes($secret))
    $hashBytes = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($data))
    return -join ($hashBytes | ForEach-Object { $_.ToString("x2") })
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VNPay E2E - Full Flow Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Register user
Write-Host "`n[1] Registering user..." -ForegroundColor Yellow
$username = "vnpay_e2e_$(Get-Random)"
$regBody = @{ username=$username; password="Test1234!"; email="$username@test.com"; fullName="VNPay E2E Test" } | ConvertTo-Json
try {
    $reg = Invoke-WebRequest -Uri "$BackendUrl/api/public/auth/register" -Method POST -ContentType "application/json" -Body $regBody -UseBasicParsing
    $regData = $reg.Content | ConvertFrom-Json
    $token = $regData.token
    Write-Host "    OK - User: $username, Role: $($regData.user.role)"
} catch {
    Write-Host "    FAIL:" $_.Exception.Message -ForegroundColor Red
    exit 1
}

$headers = @{ "Authorization" = "Bearer $token" }

# Step 2: Find a trip with seats
Write-Host "`n[2] Finding available trips..." -ForegroundColor Yellow
try {
    $trips = Invoke-RestMethod -Uri "$BackendUrl/api/public/trips" -Method GET -Headers $headers
    Write-Host "    Found $($trips.Count) trips"
} catch {
    Write-Host "    FAIL:" $_.Exception.Message -ForegroundColor Red
    exit 1
}

if ($trips.Count -eq 0) {
    Write-Host "    No trips available!" -ForegroundColor Red
    exit 1
}

$trip = $trips[0]
Write-Host "    Using trip: ID=$($trip.id) $($trip.origin) -> $($trip.destination) @ $($trip.departureTime)"

# Step 3: Get seats
Write-Host "`n[3] Getting seats..." -ForegroundColor Yellow
$seats = Invoke-RestMethod -Uri "$BackendUrl/api/public/trips/$($trip.id)/seats" -Method GET -Headers $headers
$available = $seats | Where-Object { $_.booked -eq $false } | Select-Object -First 1
if (-not $available) {
    Write-Host "    No available seats!" -ForegroundColor Red
    exit 1
}
Write-Host "    Seat: ID=$($available.id), Number=$($available.seatNumber)"

# Step 4: Book ticket
Write-Host "`n[4] Booking ticket..." -ForegroundColor Yellow
$bookBody = @{
    tripId = $trip.id
    seatId = $available.id
    price = [int]$trip.basePrice
    passengerPhone = "0909123456"
    pickupPoint = "Ben xe Mien Dong"
    dropoffPoint = "Ben xe Da Nang"
} | ConvertTo-Json

try {
    $ticket = Invoke-WebRequest -Uri "$BackendUrl/api/private/tickets" -Method POST -ContentType "application/json; charset=utf-8" -Body $bookBody -Headers $headers -UseBasicParsing
    $ticketData = $ticket.Content | ConvertFrom-Json
    $ticketId = $ticketData.id
    $ticketPrice = $ticketData.price
    Write-Host "    OK - Ticket ID=$ticketId, Status=$($ticketData.status), Price=$ticketPrice"
} catch {
    Write-Host "    FAIL:" $_.Exception.Message -ForegroundColor Red
    try { $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()); $body = $reader.ReadToEnd(); $reader.Close(); Write-Host "    Body: $body" -ForegroundColor Red } catch {}
    exit 1
}

# Step 5: Create VNPay URL
Write-Host "`n[5] Creating VNPay URL..." -ForegroundColor Yellow
$vnpayBody = @{ ticketId = $ticketId } | ConvertTo-Json
try {
    $vnpay = Invoke-WebRequest -Uri "$BackendUrl/api/private/payment/vnpay/create" -Method POST -ContentType "application/json; charset=utf-8" -Body $vnpayBody -Headers $headers -UseBasicParsing
    $vnpayData = $vnpay.Content | ConvertFrom-Json
    $txnRef = $vnpayData.txnRef
    $paymentUrl = $vnpayData.paymentUrl
    Write-Host "    OK - TxnRef: $txnRef"
    Write-Host "    URL: $($paymentUrl.Substring(0, [Math]::Min(80, $paymentUrl.Length)))..."
} catch {
    Write-Host "    FAIL:" $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Step 6: Verify HOLD
Write-Host "`n[6] Verifying HOLD status..." -ForegroundColor Yellow
$check = Get-TicketById -token $token -id $ticketId
Write-Host "    Status: $($check.status)"
Write-Host "    Payment ID: $($check.paymentId)"
Write-Host "    Payment Status: $($check.paymentStatus)"

# Step 7: Send MOCK IPN
Write-Host "`n[7] Sending MOCK IPN (ResponseCode=00, success)..." -ForegroundColor Yellow
$createDate = Get-Date -Format "yyyyMMddHHmmss"
$vnpAmount = [int64]([double]$ticketPrice * 100)

$hashParams = @{}
$hashParams["vnp_Amount"] = "$vnpAmount"
$hashParams["vnp_BankCode"] = "NCB"
$hashParams["vnp_CardType"] = "ATM"
$hashParams["vnp_Command"] = "pay"
$hashParams["vnp_CreateDate"] = $createDate
$hashParams["vnp_CurrCode"] = "VND"
$hashParams["vnp_IpAddr"] = "127.0.0.1"
$hashParams["vnp_Locale"] = "vn"
$hashParams["vnp_OrderInfo"] = "Thanh toan ve xe #$ticketId"
$hashParams["vnp_OrderType"] = "other"
$hashParams["vnp_ResponseCode"] = "00"
$hashParams["vnp_TmnCode"] = $TmnCode
$hashParams["vnp_TransactionNo"] = "88888888"
$hashParams["vnp_TxnRef"] = $txnRef

Write-Host "    Amount: $vnpAmount (= $ticketPrice VND)"
Write-Host "    TxnRef: $txnRef"
Write-Host "    ResponseCode: 00 (success)"

$secureHash = Build-VnpayHash -params $hashParams -secret $HashSecret
Write-Host "    SecureHash: $($secureHash.Substring(0, 16))..."

$bodyParams = @{}
foreach ($k in $hashParams.Keys) { $bodyParams[$k] = $hashParams[$k] }
$bodyParams["vnp_SecureHashType"] = "HmacSHA512"
$bodyParams["vnp_SecureHash"] = $secureHash

# Invoke-WebRequest tự URL-encode body khi ContentType = application/x-www-form-urlencoded
# Nên KHONG URL-encode thủ công
$sortedKeys = @($bodyParams.Keys) | Sort-Object
$bodyParts = @()
foreach ($k in $sortedKeys) {
    $bodyParts += "$k=$($bodyParams[$k])"
}
$body = $bodyParts -join "&"

try {
    $ipn = Invoke-WebRequest -Uri "$BackendUrl/api/public/payment/vnpay/ipn" -Method POST -ContentType "application/x-www-form-urlencoded" -Body $body -UseBasicParsing
    $ipnData = $ipn.Content | ConvertFrom-Json
    Write-Host "    IPN Result: RspCode=$($ipnData.RspCode), Message=$($ipnData.Message)"
    if ($ipnData.RspCode -eq "00") {
        Write-Host "    [OK] IPN confirmed by backend!" -ForegroundColor Green
    } else {
        Write-Host "    [FAIL] IPN returned error $($ipnData.RspCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "    IPN Error:" $_.Exception.Message -ForegroundColor Red
}

# Step 8: Verify PAID
Write-Host "`n[8] Verifying PAID status..." -ForegroundColor Yellow
Start-Sleep -Milliseconds 500
$final = Get-TicketById -token $token -id $ticketId
if ($final) {
    Write-Host "    Status: $($final.status)"
    Write-Host "    Payment ID: $($final.paymentId)"
    Write-Host "    Payment Method: $($final.paymentMethod)"
    Write-Host "    Payment Status: $($final.paymentStatus)"
    Write-Host "    Transaction Code: $($final.transactionCode)"
    Write-Host "    Transaction Time: $($final.transactionTime)"
    if ($final.status -eq "PAID" -and $final.paymentStatus -eq "SUCCESS") {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  SUCCESS! Ticket is PAID!" -ForegroundColor Green
        Write-Host "  Payment confirmed via mock IPN" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
    } else {
        Write-Host "    [INFO] Status=$($final.status), PaymentStatus=$($final.paymentStatus)" -ForegroundColor Magenta
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "VNPay Sandbox URL (copy & paste in browser):" -ForegroundColor Yellow
Write-Host $paymentUrl
Write-Host ""
Write-Host "Note: Open the URL above, click Thanh toan, then close." -ForegroundColor Magenta
Write-Host "The IPN callback needs ngrok to reach localhost." -ForegroundColor Magenta
Write-Host "Use the script test-vnpay-ipn-e2e.ps1 for full automation." -ForegroundColor Magenta
