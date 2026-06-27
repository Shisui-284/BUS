$headers = @{}
$r = Invoke-WebRequest -Uri 'http://localhost:8080/api/public/trips' -Method GET -Headers $headers -UseBasicParsing
Write-Host "PUBLIC /api/public/trips - Status:" $r.StatusCode

$r2 = Invoke-WebRequest -Uri 'http://localhost:8080/api/public/trips/search?date=2026-06-26' -Method GET -Headers $headers -UseBasicParsing
Write-Host "PUBLIC /api/public/trips/search - Status:" $r2.StatusCode
