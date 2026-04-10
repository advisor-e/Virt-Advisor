@echo off
echo Stopping any existing process on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
  taskkill /PID %%a /F >nul 2>&1
)
echo Starting Virt Advisor in dev mode...
set PORT=3000
npm run dev
