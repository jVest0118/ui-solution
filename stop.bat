@echo off
echo ============================================
echo  UI Solution Platform - STOP
echo ============================================

echo Stopping backend  (port 8080)...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host ('  Killed PID ' + $_.OwningProcess) }"

echo Stopping frontend (port 3000)...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host ('  Killed PID ' + $_.OwningProcess) }"

echo Done.
echo ============================================
