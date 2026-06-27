$ErrorActionPreference = "Continue"

Write-Host "========================================"
Write-Host "VNPAY END-TO-END (Trip 7)"
Write-Host "========================================"

# Register user
$regBody = @{
    username = "e2e_v7_$(Get-Random)"
    password  = "Test1234!"
    email     = "e2e_v7_$(Get-Random)@test.com"
    fullName  = "E2E Trip7"
} | ConvertTo-Json

$reg = Invoke-RestMethod -Uri 'http://localhost:8080/api/public/auth/register' -Method POST -ContentType 'application/json' -Body $regBody
$token = $reg.token
$headers = @{ "Authorization" = "Bearer $token" }
Write-Host "[1] User: $($reg.user.id)"

# Pick trip 7 + first available seat
$seats = Invoke-RestMethod -Uri 'http://localhost:8080/api/public/trips/7/seats' -Method GET -Headers $headers
$seat = $seats | Where-Object { -not $_.booked } | Select-Object -First 1
Write-Host "[2] Trip 7 / Seat $($seat.seatNumber) (id=$($seat.id))"

# Book
$bookBody = @{
    tripId         = 7
    seatId         = $seat.id
    price          = 1000000
    passengerPhone = "0909123456"
    pickupPoint    = "Ben xe Mien Dong"
    dropoffPoint   = "Ben xe Giap Bat"
} | ConvertTo-Json -Compress

$ticket = Invoke-RestMethod -Uri 'http://localhost:8080/api/private/tickets' -Method POST -ContentType 'application/json; charset=utf-8' -Headers $headers -Body $bookBody
Write-Host "[3] Ticket #$($ticket.id) status=$($ticket.status)"

# Create VNPay URL
$vnpBody = @{ ticketId = $ticket.id } | ConvertTo-Json -Compress
$vnp = Invoke-RestMethod -Uri 'http://localhost:8080/api/private/payment/vnpay/create' -Method POST -ContentType 'application/json; charset=utf-8' -Headers $headers -Body $vnpBody
Write-Host "[4] TxnRef: $($vnp.txnRef)"
Write-Host "[5] Payment URL created: $($vnp.paymentUrl.Substring(0,80))..."

# Validate URL
$ok = ($vnp.paymentUrl -match 'sandbox.vnpayment.vn') -and ($vnp.paymentUrl -match 'vnp_SecureHash=') -and ($vnp.paymentUrl -match 'vnp_TmnCode=')
Write-Host "`nRESULT: $(if($ok){'PASS - Open URL to pay'}else{'FAIL'})"
Write-Host "URL: $($vnp.paymentUrl)"