@echo off
chcp 65001 >nul
echo =========================================================
echo   Iniciando Servidor & Banco de Dados - WANDO DIESEL
echo =========================================================

:: 1. Tenta rodar com Node.js (Servidor Oficial com Banco de Dados SQLite)
where node >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Node.js detectado!
    echo [OK] Iniciando Servidor com Banco de Dados SQLite na porta 3000...
    timeout /t 1 /nobreak >nul
    start http://localhost:3000
    node server.js
    goto end
)

:: 2. Tenta rodar com Python
where python >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Python detectado. Iniciando servidor estatico na porta 8080...
    start http://localhost:8080
    python -m http.server 8080
    goto end
)

:: 3. Tenta rodar com Py (Windows Launcher)
where py >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Python (py) detectado. Iniciando servidor estatico na porta 8080...
    start http://localhost:8080
    py -m http.server 8080
    goto end
)

:: 4. Tenta rodar com Node npx http-server
where npx >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] npx detectado. Iniciando servidor estatico na porta 8080...
    start http://localhost:8080
    npx http-server -p 8080
    goto end
)

echo [ERRO] Nao foi possivel encontrar Node.js ou Python no sistema.
echo.
echo Para rodar o sistema com banco de dados SQLite persistente:
echo 1. Instale o Node.js (https://nodejs.org).
echo.
pause

:end
