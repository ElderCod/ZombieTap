@echo off
echo Building Zombie Shooter...
cd /d "%~dp0"
call npx esbuild src/browser.ts src/app.ts --bundle --outdir=dist --format=iife
echo Build complete!
pause
