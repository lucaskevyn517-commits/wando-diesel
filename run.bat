@echo off
chcp 65001 >nul
echo ==========================================
echo   Iniciando Servidor Local - WANDO DIESEL
echo ==========================================

:: Tenta rodar com Python
where python >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Python detectado. Iniciando servidor na porta 8080...
    start http://localhost:8080
    python -m http.server 8080
    goto end
)

:: Tenta rodar com Py (Windows Launcher)
where py >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Python (py) detectado. Iniciando servidor na porta 8080...
    start http://localhost:8080
    py -m http.server 8080
    goto end
)

:: Tenta rodar com Node npx http-server
where npx >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Node.js (npx) detectado. Iniciando servidor na porta 8080...
    start http://localhost:8080
    npx http-server -p 8080
    goto end
)

echo [ERRO] Não foi possível encontrar Python ou Node.js no sistema.
echo.
echo Para rodar o site localmente (devido às restrições do navegador sobre módulos ES6 em arquivos locais):
echo 1. Instale o Python ou o Node.js.
echo 2. Ou utilize a extensão "Live Server" se estiver usando o VS Code.
echo 3. Ou inicie qualquer servidor HTTP apontando para esta pasta.
echo.
pause

:end
