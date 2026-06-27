# Bus Management - Dev Startup Script
# Run: powershell -ExecutionPolicy Bypass -File start-dev.ps1

Write-Host "Starting Bus Management Dev Environment..." -ForegroundColor Green

# Start backend
Write-Host "Starting backend (Spring Boot)..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd backend; mvn spring-boot:run" -WindowStyle Normal

Start-Sleep 5

# Start frontend
Write-Host "Starting frontend (Vite)..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal

Start-Sleep 8

# Start ngrok for frontend
Write-Host "Starting ngrok tunnel (frontend 4173)..." -ForegroundColor Yellow
Start-Process -FilePath "ngrok" -ArgumentList "http", "4173" -WindowStyle Normal

Write-Host ""
Write-Host "All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:8080" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:4173" -ForegroundColor Cyan
Write-Host "Ngrok:    check http://localhost:4040 for public URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test flow: book ticket -> VNPay -> card 9704198526191432198 -> OTP 123456" -ForegroundColor Magenta