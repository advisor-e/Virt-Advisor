@echo off
REM ---------------------------------------------------------------------------
REM  npm run go  --  start the whole app in one window.
REM
REM  Frees ports 3000 and 4000 first, then starts BOTH halves together:
REM  Nuxt on :3000 (cyan) and the Restify backend on :4000 (green).
REM
REM  WHY THE PORTS ARE CLEARED FIRST. Nuxt 2's dev server hangs or runs out of
REM  memory in a long session and keeps holding :3000, after which every restart
REM  fails in a way that looks like a code fault. dev.bat already cleared :3000
REM  for the frontend alone; this does the same for both, so one command always
REM  starts from a known state.
REM
REM  WARNING: this force-stops WHATEVER is listening on 3000 or 4000, which
REM  includes Advisor Collaborate -- it shares both ports and only one of the two
REM  apps runs at a time. Close it first if you want to keep it.
REM
REM  Environment comes from .env, which the backend loads itself at startup
REM  (server/restify-server.js). NODE_EXTRA_CA_CERTS is the one exception: Node
REM  reads it before any code runs, so it must already be in the environment --
REM  putting it in .env has no effect.
REM ---------------------------------------------------------------------------
setlocal

echo Freeing port 3000 (frontend)...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
)

echo Freeing port 4000 (backend)...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":4000 " ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo.
echo Starting frontend (http://localhost:3000) and backend (http://localhost:4000).
echo Press Ctrl+C to stop both.
echo.

REM  Reuses the existing dev:all script rather than repeating its two commands,
REM  so there stays exactly one definition of how each half is started.
call npm run dev:all
