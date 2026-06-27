$ErrorActionPreference = "Continue"
$BackendUrl = "http://localhost:8080"
$TmnCode = "SY273SZH"
$HashSecret = "SFP53JL1Z5AS4O5WFIEBMEARJAEMDTBT"

Write-Host "Login test..."

$b = @{ username="levuhao"; password="Test1234!"; role="CUSTOMER" } | ConvertTo-Json
try {
    $r = Invoke-WebRequest -Uri "$BackendUrl/api/public/auth/login" -Method POST -ContentType "application/json" -Body $b -UseBasicParsing
    Write-Host "Status:" $r.StatusCode
    Write-Host "Content:" $r.Content.Substring(0, [Math]::Min(200, $r.Content.Length))
} catch {
    Write-Host "Login Error Status:" $_.Exception.Response.StatusCode
    try {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        $reader.Close()
        Write-Host "Body:" $body
    } catch {}
}
