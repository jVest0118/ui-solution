@echo off
echo ============================================
echo  UI Solution Platform - RESTART
echo ============================================
call "%~dp0stop.bat"
powershell -NoProfile -Command "Start-Sleep -Seconds 3"
call "%~dp0start.bat"
