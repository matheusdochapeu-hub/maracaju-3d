@echo off
chcp 65001 >nul
title Maracaju 3D - Gemeo Digital (Casa Maracaju 88)
cd /d "%~dp0"

echo ==================================================================
echo   Maracaju 3D - Gemeo Digital & Simulador Solar (Casa Maracaju 88)
echo ==================================================================
echo.

where python >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Python detectado! Iniciando servidor completo (Notebook + Wi-Fi Celular)...
    start "" http://127.0.0.1:8088
    python run_maracaju_3d.py
    goto :end
)

where py >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Python Launcher detectado! Iniciando servidor completo...
    start "" http://127.0.0.1:8088
    py -3 run_maracaju_3d.py
    goto :end
)

echo [INFO] Python nao encontrado neste PC. Usando servidor nativo do Windows (PowerShell)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\start_win_server.ps1"

:end
pause
