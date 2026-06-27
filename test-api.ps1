param([string]$url, [string]$token = $null)
$headers = @{}
if ($token) { $headers["Authorization"] = "Bearer $token" }
$response = Invoke-WebRequest -Uri $url -Method GET -Headers $headers -UseBasicParsing
Write-Host "Status: $($response.StatusCode)"
Write-Host "Body: $($response.Content)"
