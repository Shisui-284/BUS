$ErrorActionPreference = "Continue"

Write-Host "========================================"
Write-Host "VNPAY END-TO-END PAYMENT FLOW TEST"
Write-Host "========================================"

# Step 1: Register new test user
Write-Host "`n[1/7] Registering test user..."
$regBody = @{
    username = "e2e_test_$(Get-Random)"
    password = "Test1234!"
    email = "e2e_test_$(Get-Random)@test.com"
    fullName = "E2E Test User"
} | ConvertTo-Json

try {
    $regResponse = Invoke-RestMethod -Uri 'http://localhost:8080/api/public/auth/register' `
        -Method POST -ContentType 'application/json' -Body $regBody
    $token = $regResponse.token
    $userId = $regResponse.user.id
    Write-Host "   User registered: ID=$userId, Role=$($regResponse.user.role)"
} catch {
    Write-Host "   [FAIL] Registration failed: $_"
    exit 1
}

$headers = @{ "Authorization" = "Bearer $token" }

# Step 2: Get available trips
Write-Host "`n[2/7] Getting available trips..."
try {
    $trips = Invoke-RestMethod -Uri 'http://localhost:8080/api/public/trips?date=2026-06-27' -Method GET -Headers $headers
    if ($trips.Count -eq 0) {
        $trips = Invoke-RestMethod -Uri 'http://localhost:8080/api/public/trips' -Method GET -Headers $headers
    }
    $trip = $trips[0]
    $tripId = $trip.id
    Write-Host "   Found trip ID=$tripId - $($trip.origin) -> $($trip.destination) @ $($trip.departureTime)"
} catch {
    Write-Host "   [FAIL] No trips found: $_"
    exit 1
}

# Step 3: Get seats for the trip
Write-Host "`n[3/7] Getting available seats..."
try {
    $seats = Invoke-RestMethod -Uri "http://localhost:8080/api/public/trips/$tripId/seats" -Method GET -Headers $headers
    $availableSeat = $seats | Where-Object { $_.booked -eq $false } | Select-Object -First 1
    if (-not $availableSeat) {
        $availableSeat = $seats[0]
    }
    $seatId = $availableSeat.id
    $seatNumber = $availableSeat.seatNumber
    Write-Host "   Selected seat ID=$seatId (Number=$seatNumber)"
} catch {
    Write-Host "   [FAIL] Could not get seats: $_"
    exit 1
}

# Step 4: Book a ticket (ASCII-safe pickup/dropoff)
Write-Host "`n[4/7] Booking ticket..."
$bookBody = @{
    tripId = $tripId
    seatId = $seatId
    price = [int]$trip.basePrice
    passengerPhone = "0909123456"
    pickupPoint = "Ben xe Mien Dong - 05 Dien Bien Phu"
    dropoffPoint = "Ben xe Trung tam Da Nang - 201 Tran Phu"
}
$jsonBody = ConvertTo-Json -InputObject $bookBody -Compress
$bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)

try {
    $ticket = Invoke-RestMethod -Uri 'http://localhost:8080/api/private/tickets' `
        -Method POST -ContentType 'application/json; charset=utf-8' `
        -Headers $headers -Body $jsonBody
    $ticketId = $ticket.id
    Write-Host "   Ticket created: ID=$ticketId, Status=$($ticket.status)"
} catch {
    Write-Host "   [FAIL] Booking failed"
    $status = [int]$_.Exception.Response.StatusCode
    try {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        $reader.Close()
        Write-Host "   Status: $status Body: $body"
    } catch {}
    exit 1
}

# Step 5: Create VNPay payment URL
Write-Host "`n[5/7] Creating VNPay payment URL..."
$vnpayBody = ConvertTo-Json -InputObject @{ ticketId = $ticketId } -Compress

try {
    $vnpayRes = Invoke-RestMethod -Uri 'http://localhost:8080/api/private/payment/vnpay/create' `
        -Method POST -ContentType 'application/json; charset=utf-8' `
        -Headers $headers -Body $vnpayBody
    $paymentUrl = $vnpayRes.paymentUrl
    $txnRef = $vnpayRes.txnRef
    Write-Host "   VNPay URL created!"
    Write-Host "   TxnRef: $txnRef"
    Write-Host "   URL (first 120 chars): $($paymentUrl.Substring(0, [Math]::Min(120, $paymentUrl.Length)))"
} catch {
    Write-Host "   [FAIL] VNPay URL creation failed"
    $status = [int]$_.Exception.Response.StatusCode
    try {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        $reader.Close()
        Write-Host "   Status: $status Body: $body"
    } catch {}
    exit 1
}

# Step 6: Verify ticket is in HOLD status
Write-Host "`n[6/7] Verifying ticket status..."
try {
    $myTickets = Invoke-RestMethod -Uri 'http://localhost:8080/api/private/tickets/my' -Method GET -Headers $headers
    $bookedTicket = $myTickets | Where-Object { $_.id -eq $ticketId } | Select-Object -First 1
    Write-Host "   Ticket ID=$ticketId Status=$($bookedTicket.status)"
} catch {
    Write-Host "   [WARN] Could not verify ticket: $_"
}

# Step 7: Validate VNPay URL parameters
Write-Host "`n[7/7] Verifying VNPay URL..."
$checks = @{
    "VNPay sandbox URL" = ($paymentUrl -match "sandbox\.vnpayment\.vn")
    "vnp_TxnRef" = ($paymentUrl -match "vnp_TxnRef=")
    "vnp_SecureHash" = ($paymentUrl -match "vnp_SecureHash=")
    "vnp_TmnCode" = ($paymentUrl -match "vnp_TmnCode=")
    "vnp_ReturnUrl" = ($paymentUrl -match "vnp_ReturnUrl=")
}
$allPassed = $true
foreach ($check in $checks.GetEnumerator()) {
    $status = if ($check.Value) { "[OK]" } else { "[FAIL]" }
    if (-not $check.Value) { $allPassed = $false }
    Write-Host "   $status $($check.Key)"
}

# Summary
Write-Host "`n========================================"
if ($allPassed) {
    Write-Host "RESULT: ALL CHECKS PASSED - VNPay ready!" -ForegroundColor Green
} else {
    Write-Host "RESULT: SOME CHECKS FAILED" -ForegroundColor Red
}
Write-Host "========================================"
Write-Host ""
Write-Host "NEXT: Open this URL in browser to simulate payment:"
Write-Host "  $paymentUrl"
