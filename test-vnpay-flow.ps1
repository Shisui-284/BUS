# Test login to get JWT token
$loginBody = @{
    username = "testuser1"
    password = "Test1234!"
    role = "CUSTOMER"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri 'http://localhost:8080/api/public/auth/login' `
    -Method POST `
    -ContentType 'application/json' `
    -Body $loginBody

Write-Host "=== LOGIN RESULT ==="
Write-Host "Token:" $loginResponse.token
Write-Host "User ID:" $loginResponse.user.id
Write-Host "User Role:" $loginResponse.user.role

$token = $loginResponse.token

# Test private endpoint with this token
$headers = @{ "Authorization" = "Bearer $token" }

$r = Invoke-RestMethod -Uri 'http://localhost:8080/api/private/tickets/my' `
    -Method GET `
    -Headers $headers

Write-Host "`n=== GET MY TICKETS ==="
Write-Host "Status: Success"
Write-Host "Tickets count:" $r.Count

# Test VNPay payment create (this is the endpoint that was returning 403)
Write-Host "`n=== TEST VNPAY ENDPOINT (without booking first - should return 404) ==="
try {
    $vnpayBody = @{ ticketId = 9999 } | ConvertTo-Json
    $vnpayResponse = Invoke-RestMethod -Uri 'http://localhost:8080/api/private/payment/vnpay/create' `
        -Method POST `
        -ContentType 'application/json' `
        -Headers $headers `
        -Body $vnpayBody
    Write-Host "VNPay result:" $vnpayResponse
} catch {
    $status = [int]$_.Exception.Response.StatusCode
    $body = ""
    try {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        $reader.Close()
    } catch {}
    Write-Host "VNPay Error - Status: $status"
    Write-Host "Body: $body"
}
