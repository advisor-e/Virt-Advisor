@echo off
REM ---------------------------------------------------------------------------
REM  npm run serve  --  build once, then run the built app. BOTH halves.
REM
REM  THE DEFAULT FOR ANY TESTING SESSION (Mike's ruling, 2026-08-02):
REM  "we have a lot to test and cant afford to keep wasting time -- ALWAYS do
REM  this in future." The Nuxt 2 DEV server leaks memory across rebuilds and had
REM  fallen over five times in one session -- twice out of memory at a 12 GB
REM  heap, once a native crash, twice wedged (still holding port 3000, answering
REM  nothing, which reads exactly like broken code). A production build has no
REM  rebuild watcher and none of that.
REM
REM  Use `npm run go` instead only when actively CHANGING code and hot reload
REM  genuinely earns its keep.
REM
REM  The build runs with the same 12 GB heap the dev script uses -- the build
REM  itself is the memory-hungry step, and the plain `build` script sets no flag.
REM
REM  WARNING: force-stops whatever is listening on 3000 or 4000, which includes
REM  Advisor Collaborate -- it shares both ports and only one app runs at a time.
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

REM  The dev server MUST be down before this point: a build shares the .nuxt
REM  folder with a running dev server and leaves it serving a mixture of old and
REM  new code, which then gets debugged as a code bug (WORKING-AGREEMENT).
echo.
echo Building the production bundle. This takes a few minutes.
echo.
set NODE_OPTIONS=--max-old-space-size=12288
call npm run build
if errorlevel 1 (
  echo.
  echo BUILD FAILED - not starting. Fix the error above and run this again.
  exit /b 1
)

echo.
echo Starting frontend (http://localhost:3000) and backend (http://localhost:4000).
echo Press Ctrl+C to stop both.
echo.

REM  Goes through an npm script rather than invoking concurrently here: quoting a
REM  nested command inside a .bat that npm itself launched mangles the arguments,
REM  and concurrently then reads them as extra commands. `dev:all` has always been
REM  defined this way and has always worked; `serve:all` mirrors it exactly.
call npm run serve:all
