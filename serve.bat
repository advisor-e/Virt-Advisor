@echo off
echo Stopping any existing server on port 4001...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":4001 " ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a 2>nul
)
timeout /t 2 /nobreak >nul
echo Building production bundle...
call nuxt build
echo Starting production server...
nuxt start
