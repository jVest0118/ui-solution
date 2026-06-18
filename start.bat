@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"
set BASE=%~dp0
set BACKEND=%BASE%backend
set FRONTEND=%BASE%frontend
set JAR=%BACKEND%\target\platform-1.0.0.jar
set LOG_BE=%BASE%backend.log
set LOG_FE=%BASE%frontend.log

echo ============================================
echo  UI Solution Platform - START
echo ============================================

echo [0/3] Stopping existing servers...
powershell -NoProfile -Command "$p8=Get-NetTCPConnection -LocalPort 8080 -State Listen -EA 0; if($p8){Stop-Process -Id $p8.OwningProcess -Force -EA 0; Write-Host '  BE stopped'}"
powershell -NoProfile -Command "$p3=Get-NetTCPConnection -LocalPort 3000 -State Listen -EA 0; if($p3){Stop-Process -Id $p3.OwningProcess -Force -EA 0; Write-Host '  FE stopped'}"
powershell -NoProfile -Command "Start-Sleep -Seconds 2"

echo [1/3] Building backend...
cd /d "%BACKEND%"
if not exist pom.xml (
    echo [ERROR] pom.xml not found in %BACKEND%
    exit /b 1
)
call mvn clean package -DskipTests -q
if %errorlevel% neq 0 (
    echo [ERROR] Backend build failed!
    exit /b 1
)
echo       Build OK

echo [2/3] Starting backend (port 8080)...
start "UI-Backend" /MIN cmd /c "java -jar %JAR% >> %LOG_BE% 2>&1"
echo       Waiting 18s...
powershell -NoProfile -Command "Start-Sleep -Seconds 18"

echo [3/3] Starting frontend (port 3000)...
cd /d "%FRONTEND%"
start "UI-Frontend" /MIN cmd /c "npm run dev >> %LOG_FE% 2>&1"

echo.
echo ============================================
echo  Backend  : http://localhost:8080/api
echo  Frontend : http://localhost:3000
echo  Log BE   : %LOG_BE%
echo  Log FE   : %LOG_FE%
echo ============================================
endlocal
