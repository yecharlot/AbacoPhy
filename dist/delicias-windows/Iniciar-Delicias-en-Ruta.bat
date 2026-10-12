@echo off
cd /d "%~dp0"
set PORT=8090
set DELICIAS_HOME=1
set ABACOPHY_STATIC=static
set ABACOPHY_DATA=abacophy_data
echo Delicias en Ruta - AbacoPhy
echo http://127.0.0.1:8090/delicias-en-ruta/
start "" http://127.0.0.1:8090/delicias-en-ruta/
DeliciasEnRuta.exe
pause
