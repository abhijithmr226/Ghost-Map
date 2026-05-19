@echo off
title GhostMap — One-Click Install ^& Run
color 0B
cls

echo.
echo  ██████╗ ██╗  ██╗ ██████╗ ███████╗████████╗███╗   ███╗ █████╗ ██████╗
echo  ██╔════╝██║  ██║██╔═══██╗██╔════╝╚══██╔══╝████╗ ████║██╔══██╗██╔══██╗
echo  ██║  ███╗███████║██║   ██║███████╗   ██║   ██╔████╔██║███████║██████╔╝
echo  ██║   ██║██╔══██║██║   ██║╚════██║   ██║   ██║╚██╔╝██║██╔══██║██╔═══╝
echo  ╚██████╔╝██║  ██║╚██████╔╝███████║   ██║   ██║ ╚═╝ ██║██║  ██║██║
echo   ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝
echo.
echo  Visual Network Recon Dashboard  --  One-Click Installer
echo  ─────────────────────────────────────────────────────────
echo.

REM ── Get script directory ──────────────────────────────────────────────────────
set "ROOT=%~dp0"
cd /d "%ROOT%"

REM ── Check Node.js ─────────────────────────────────────────────────────────────
echo [1/5] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo       Node.js not found. Installing via winget...
    winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo       ERROR: Could not auto-install Node.js.
        echo       Please download from https://nodejs.org and re-run this file.
        pause
        exit /b 1
    )
    REM Refresh PATH
    for /f "tokens=*" %%i in ('where node 2^>nul') do set "NODE_PATH=%%i"
    call refreshenv >nul 2>&1
)
echo       OK: Node.js found
for /f "delims=" %%v in ('node --version 2^>nul') do echo       Version: %%v

REM ── Check / Install nmap ──────────────────────────────────────────────────────
echo.
echo [2/5] Checking nmap...
set "NMAP_EXE="
if exist "%ProgramFiles(x86)%\Nmap\nmap.exe" set "NMAP_EXE=%ProgramFiles(x86)%\Nmap\nmap.exe"
if exist "%ProgramFiles%\Nmap\nmap.exe"      set "NMAP_EXE=%ProgramFiles%\Nmap\nmap.exe"
where nmap >nul 2>&1 && set "NMAP_EXE=nmap"

if "%NMAP_EXE%"=="" (
    echo       nmap not found. Installing via winget...
    winget install --id Insecure.Nmap -e --silent --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo       ERROR: winget install failed. Trying direct download...
        powershell -Command "Invoke-WebRequest -Uri 'https://nmap.org/dist/nmap-7.95-setup.exe' -OutFile '%TEMP%\nmap-setup.exe'"
        echo       Running installer (UAC prompt may appear)...
        powershell -Command "Start-Process '%TEMP%\nmap-setup.exe' -ArgumentList '/S' -Verb RunAs -Wait"
    )
    if exist "%ProgramFiles(x86)%\Nmap\nmap.exe" (
        set "NMAP_EXE=%ProgramFiles(x86)%\Nmap\nmap.exe"
    ) else if exist "%ProgramFiles%\Nmap\nmap.exe" (
        set "NMAP_EXE=%ProgramFiles%\Nmap\nmap.exe"
    ) else (
        echo       ERROR: nmap install failed. GhostMap will run in limited mode.
    )
)
if not "%NMAP_EXE%"=="" echo       OK: nmap found at %NMAP_EXE%

REM ── Install server dependencies ───────────────────────────────────────────────
echo.
echo [3/5] Installing server dependencies...
cd /d "%ROOT%server"
if not exist "node_modules" (
    call npm install --silent
    if %errorlevel% neq 0 (echo       ERROR: npm install failed in server && pause && exit /b 1)
)
echo       OK: Server dependencies ready
cd /d "%ROOT%"

REM ── Install client dependencies ───────────────────────────────────────────────
echo.
echo [4/5] Installing client dependencies...
cd /d "%ROOT%client"
if not exist "node_modules" (
    call npm install --silent
    if %errorlevel% neq 0 (echo       ERROR: npm install failed in client && pause && exit /b 1)
)
echo       OK: Client dependencies ready
cd /d "%ROOT%"

REM ── Launch ────────────────────────────────────────────────────────────────────
echo.
echo [5/5] Launching GhostMap...
echo.

REM Start backend in new window
if not "%NMAP_EXE%"=="" (
    start "GhostMap Backend" cmd /k "cd /d "%ROOT%server" && set NMAP_PATH=%NMAP_EXE% && node server.js"
) else (
    start "GhostMap Backend" cmd /k "cd /d "%ROOT%server" && node server.js"
)

REM Wait for backend to start
timeout /t 2 /nobreak >nul

REM Start frontend in new window
start "GhostMap Frontend" cmd /k "cd /d "%ROOT%client" && npm run dev"

REM Wait for Vite to start
timeout /t 4 /nobreak >nul

REM Open browser
echo       Opening http://localhost:5173 ...
start "" "http://localhost:5173"

echo.
echo  ─────────────────────────────────────────────────────────
echo   GhostMap is running!
echo   Dashboard:  http://localhost:5173
echo   API:        http://localhost:5000
echo   Close the two terminal windows to stop GhostMap.
echo  ─────────────────────────────────────────────────────────
echo.
pause
