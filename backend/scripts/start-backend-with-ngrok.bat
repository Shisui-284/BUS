@echo off
REM ==========================================================
REM  start-backend-with-ngrok.bat
REM  Khởi động backend Spring Boot với IPN URL trỏ về ngrok.
REM
REM  BƯỚC 1: Chạy ngrok trước
REM    > ngrok http 8080
REM  BƯỚC 2: Copy URL Forwarding (ví dụ https://abc123.ngrok-free.app)
REM  BƯỚC 3: Chạy:  start-backend-with-ngrok.bat <ngrok-url>
REM ==========================================================

if "%~1"=="" (
    echo ==========================================================
    echo  Loi: Thieu URL ngrok
    echo  Su dung: start-backend-with-ngrok.bat https://xxxx.ngrok-free.app
    echo ==========================================================
    exit /b 1
)

set NGROK_URL=%~1
REM Xoa dau / cuoi neu co
set NGROK_URL=%NGROK_URL:/=%
set NGROK_URL=https://%NGROK_URL%

set IPN_URL=%NGROK_URL%/api/public/payment/vnpay/ipn

echo.
echo ==========================================================
echo   Khoi dong backend voi IPN URL:
echo   %IPN_URL%
echo ==========================================================
echo.
echo  Nho paste URL nay vao dashboard VNPay sandbox:
echo   https://sandbox.vnpayment.vn -^> Cau hinh IPN
echo.

set VNPAY_IPN_URL=%IPN_URL%

cd /d "%~dp0\.."
mvnw.cmd spring-boot:run