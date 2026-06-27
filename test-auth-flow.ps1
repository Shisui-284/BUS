# Step 1: Register a new test user
Write-Host "=== STEP 1: Register test user ==="
$regBody = @{
    username = "vnpaytest_$(Get-Random)"
    password = "Test1234!"
    email = "vnpaytest_$(Get-Random)@test.com"
    fullName = "VNPay Test User"
} | ConvertTo-Json

try {
    $regResponse = Invoke-RestMethod -Uri 'http://localhost:8080/api/public/auth/register' `
        -Method POST `
        -ContentType 'application/json' `
        -Body $regBody
    Write-Host "Registration SUCCESS"
    Write-Host "User ID:" $regResponse.user.id
    Write-Host "User Role:" $regResponse.user.role
    $token = $regResponse.token
} catch {
    $status = [int]$_.Exception.Response.StatusCode
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $body = $reader.ReadToEnd()
    $reader.Close()
    Write-Host "Registration FAILED - Status: $status Body: $body"
    Write-Host "Using existing testuser1 token approach..."

    # Try login instead
    $loginBody = @{
        username = "levuhao"
        password = "Test1234!"
        role = "CUSTOMER"
    } | ConvertTo-Json
    try {
        $loginResponse = Invoke-RestMethod -Uri 'http://localhost:8080/api/public/auth/login' `
            -Method POST -ContentType 'application/json' -Body $loginBody
        $token = $loginResponse.token
        Write-Host "Login SUCCESS - Token:" $token.Substring(0, [Math]::Min(30, $token.Length)) "..."
    } catch {
        Write-Host "Login FAILED - trying testuser1"
        $loginBody2 = @{
            username = "testuser1"
            password = "Test1234!"
            role = "CUSTOMER"
        } | ConvertTo-Json
        try {
            $loginResponse2 = Invoke-RestMethod -Uri 'http://localhost:8080/api/public/auth/login' `
                -Method POST -ContentType 'application/json' -Body $loginBody2
            $token = $loginResponse2.token
            Write-Host "testuser1 Login SUCCESS - Token:" $token.Substring(0, [Math]::Min(30, $token.Length)) "..."
        } catch {
            Write-Host "testuser1 Login FAILED - Status:" [int]$_.Exception.Response.StatusCode
        }
    }
}

if (-not $token) {
    Write-Host "NO TOKEN - Cannot continue tests"
    exit 1
}

# Step 2: Test private endpoint (GET tickets)
Write-Host "`n=== STEP 2: GET /api/private/tickets/my ==="
$headers = @{ "Authorization" = "Bearer $token" }
try {
    $r = Invoke-RestMethod -Uri 'http://localhost:8080/api/private/tickets/my' `
        -Method GET -Headers $headers
    Write-Host "SUCCESS - Tickets count:" $r.Count
} catch {
    $status = [int]$_.Exception.Response.StatusCode
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $body = $reader.ReadToEnd()
    $reader.Close()
    Write-Host "FAILED - Status: $status Body: $body"
}

# Step 3: Try to book a ticket (need a valid trip/seat)
Write-Host "`n=== STEP 3: GET available trips ==="
try {
    $trips = Invoke-RestMethod -Uri 'http://localhost:8080/api/public/trips?date=2026-06-27' -Method GET
    Write-Host "Trips found:" $trips.Count
    if ($trips.Count -gt 0) {
        Write-Host "First trip ID:" $trips[0].id
    }
} catch {
    Write-Host "Failed to get trips"
}

# Step 4: Try VNPay endpoint with a non-existent ticket (should get 400/404, NOT 403)
Write-Host "`n=== STEP 4: POST /api/private/payment/vnpay/create (ticketId=9999) ==="
try {
    $vnpayBody = @{ ticketId = 9999 } | ConvertTo-Json
    $vnpayResponse = Invoke-RestMethod -Uri 'http://localhost:8080/api/private/payment/vnpay/create' `
        -Method POST -ContentType 'application/json' -Headers $headers -Body $vnpayBody
    Write-Host "Unexpected SUCCESS: $vnpayResponse"
} catch {
    $status = [int]$_.Exception.Response.StatusCode
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $body = $reader.ReadToEnd()
    $reader.Close()
    Write-Host "Status: $status"
    Write-Host "Body: $body"
    if ($status -eq 403) {
        Write-Host "`n!!! GOT 403 - This is the bug we're trying to fix !!!"
    } elseif ($status -eq 401) {
        Write-Host "Got 401 - Authentication issue (entry point working)"
    } elseif ($status -eq 404 -or $status -eq 400) {
        Write-Host "CORRECT - 404/400 means auth is working, only the ticket was not found"
    }
}
