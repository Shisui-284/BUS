#!/usr/bin/env pwsh
# Start backend Spring Boot service in a NEW terminal window that stays open.
param()

$backendPath = "D:\metbus\BUS\backend"
$logFile = "D:\metbus\BUS\backend-backend-stdout-new.log"

# Kill any existing java/mvn processes
Get-Process -Name java -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name mvn -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 3

# Launch a new PowerShell window that runs mvn
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "powershell.exe"
$psi.Arguments = "-NoExit -Command `"Set-Location '$backendPath'; & mvn spring-boot:run *> '$logFile'`""
$psi.WorkingDirectory = $backendPath
$psi.UseShellExecute = $true

$proc = [System.Diagnostics.Process]::Start($psi)
Write-Host "Started backend in new terminal, PID=$($proc.Id), log=$logFile"