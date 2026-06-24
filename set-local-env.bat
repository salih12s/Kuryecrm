@echo off
REM ============================================================
REM  KuryeCrm - Switch to LOCAL environment
REM  Copies .env.local files into the active .env files.
REM ============================================================

setlocal
set "ROOT=%~dp0"

echo.
echo [KuryeCrm] Activating LOCAL environment...
echo.

REM ---- Backend ----
if exist "%ROOT%backend\.env.local" (
    copy /Y "%ROOT%backend\.env.local" "%ROOT%backend\.env" >nul
    echo   [OK] backend\.env.local  -^>  backend\.env
) else (
    echo   [SKIP] backend\.env.local not found
)

REM ---- Frontend ----
if exist "%ROOT%frontend\.env.local" (
    copy /Y "%ROOT%frontend\.env.local" "%ROOT%frontend\.env" >nul
    echo   [OK] frontend\.env.local -^>  frontend\.env
) else (
    echo   [SKIP] frontend\.env.local not found
)

echo.
echo [KuryeCrm] LOCAL environment is now active.
echo.
endlocal
