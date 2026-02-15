@echo off
title Compilar Plugin a EXE
color 0E
echo.
echo ========================================================
echo   COMPILACION A EJECUTABLE - AGENTE REMOTO (.EXE)
echo ========================================================
echo.
echo Este script compilara el agente remoto a un ejecutable standalone
echo que NO requiere Python instalado para funcionar.
echo.
echo Seleccione el modo de compilacion:
echo.
echo [1] PRODUCCION - Sin consola (recomendado para cliente)
echo [2] DEBUG - Con consola (para desarrollo/debugging)
echo.
set /p modo="Ingrese opcion (1 o 2): "

if "%modo%"=="2" (
    set "argumento=debug"
    echo.
    echo Compilando en modo DEBUG (con consola)...
) else (
    set "argumento="
    echo.
    echo Compilando en modo PRODUCCION (sin consola)...
)

echo.
pause
echo.

echo [1/3] Verificando Python...
set "PYTHON_EXE=%~dp0.venv311\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    echo [ERROR] No se encontro .venv311 en esta carpeta.
    echo         Ruta esperada: %PYTHON_EXE%
    echo.
    echo Cree el entorno con Python 3.11 y vuelva a intentar:
    echo   py -3.11 -m venv .venv311
    echo   .venv311\Scripts\python.exe -m pip install -r requirements.txt
    pause
    exit /b 1
)
echo [OK] Python .venv311 detectado
echo.

echo [2/3] Instalando PyInstaller...
"%PYTHON_EXE%" -m pip install --quiet --upgrade pyinstaller
echo [OK] PyInstaller listo
echo.

echo [3/3] Compilando printer_agent.py a .exe...
"%PYTHON_EXE%" build_exe.py %argumento%

echo.
echo ========================================================
echo     COMPILACION COMPLETADA
echo ========================================================
echo.
echo El ejecutable esta en: dist\montis-printer-agent.exe
echo.
echo IMPORTANTE: Comparta este .exe con el cliente.
echo Solo necesita hacer doble clic para ejecutarlo.
echo.
echo El cliente debe pegar su codigo de activacion en la UI
echo y seleccionar la impresora correcta en el desplegable.
echo.
pause
