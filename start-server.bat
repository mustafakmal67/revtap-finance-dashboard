@echo off
title PakCommerce Financial OS - Pakistan E-Commerce Server
echo =================================================================
echo   Starting PakCommerce Financial OS (Permanent SQLite Database)
echo =================================================================
echo.
cd /d "%~dp0"
start "" "http://localhost:5000"
node server.js
pause
