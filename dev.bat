@echo off
echo Stopping any existing server on port 3000...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a 2>nul
)
timeout /t 2 /nobreak >nul
echo Starting dev server...
cross-env NODE_OPTIONS=--max-old-space-size=8192 nuxt
