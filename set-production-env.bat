@echo off
REM ============================================================
REM  KuryeCrm - Switch to PRODUCTION environment
REM  Copies .env.production files into the active .env files.
REM  WARNING: production secrets are never committed to git.
REM ============================================================

setlocal
set "ROOT=%~dp0"

echo.
echo [KuryeCrm] Activating PRODUCTION environment...
echo.

REM ---- Backend ----
if exist "%ROOT%backend\.env.production" (
    copy /Y "%ROOT%backend\.env.production" "%ROOT%backend\.env" >nul
    echo   [OK] backend\.env.production  -^>  backend\.env
) else (
    echo   [SKIP] backend\.env.production not found
)

REM ---- Frontend ----
if exist "%ROOT%frontend\.env.production" (
    copy /Y "%ROOT%frontend\.env.production" "%ROOT%frontend\.env" >nul
    echo   [OK] frontend\.env.production -^>  frontend\.env
) else (
    echo   [SKIP] frontend\.env.production not found
)

echo.
echo [KuryeCrm] PRODUCTION environment is now active.
echo [KuryeCrm] Make sure backend\.env.production has real credentials.
echo.
endlocal
