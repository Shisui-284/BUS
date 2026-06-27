#!/usr/bin/env pwsh
# Start backend Spring Boot without DevTools (avoid restart loop on stuck init).
param()

$backendPath = "D:\metbus\BUS\backend"
$logFile = "D:\metbus\BUS\backend-backend-stdout-new.log"

Get-Process -Name java -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name mvn -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "powershell.exe"
$psi.Arguments = "-NoExit -Command `"Set-Location '$backendPath'; `$env:SPRING_DEVTOOLS_LIVERELOAD_ENABLED='false'; `$env:SPRING_DEVTOOLS_RESTART_ENABLED='false'; `$env:SPRING_AUTOCONFIG_EXCLUDE='org.springframework.boot.devtools.autoconfigure.DevToolsDataSourceAutoConfiguration'; `$env:JAVA_TOOL_OPTIONS='-Dspring.devtools.livereload.enabled=false -Dspring.devtools.restart.enabled=false'; & mvn spring-boot:run *> '$logFile'`""
$psi.WorkingDirectory = $backendPath
$psi.UseShellExecute = $true

$proc = [System.Diagnostics.Process]::Start($psi)
Write-Host "Started backend (env disables DevTools), PID=$($proc.Id)"