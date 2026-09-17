@echo off
setlocal
if not exist "%~dp0..\assets\dashboard.js" (
  echo Dashboard files missing. Run npm install and npm run build in frontend.
  pause
  exit /b 1
)
start "" "%~dp0..\index.html"
