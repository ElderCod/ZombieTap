@echo off
echo Compiling simulation...
node_modules\.bin\esbuild simulate.ts --bundle --platform=node --outfile=simulate.js
echo.
echo Running simulation...
node simulate.js
pause
