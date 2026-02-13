"""
Script para compilar el agente de impresión remota a ejecutable .exe
Genera un archivo standalone que no requiere Python instalado
"""

import PyInstaller.__main__
import os
import sys

def compilar(con_consola=False):
    """Compila printer_agent.py a ejecutable .exe usando PyInstaller"""
    
    print("=" * 60)
    print("Compilando Plugin de Impresión Montis Cloud...")
    print("=" * 60)
    
    # Elegir modo de ventana
    modo_ventana = '--console' if con_consola else '--noconsole'
    
    # Configuración de PyInstaller
    PyInstaller.__main__.run([
        'printer_agent.py',                  # Archivo principal
        '--name=montis-printer-agent',       # Nombre del ejecutable
        '--onefile',                         # Un solo archivo .exe
        modo_ventana,                        # Modo de ventana
        '--icon=NONE',                       # Agregar ícono si existe
        '--clean',                           # Limpiar archivos temporales
        '--distpath=dist',                   # Carpeta de salida
        '--workpath=build',                  # Carpeta temporal
        '--hidden-import=requests',          # Asegurar imports
        '--noupx',                           # No comprimir con UPX (más compatible)
        '--noconfirm',                       # No pedir confirmación
    ])
    
    print("\n" + "=" * 60)
    print("✅ Compilación completada")
    print("=" * 60)
    print(f"Ejecutable generado en: dist\\montis-printer-agent.exe")
    print(f"Modo: {'Con consola (debug)' if con_consola else 'Sin consola (producción)'}")
    print("=" * 60)
    print("\nPróximos pasos:")
    print("1. Probar el .exe localmente")
    print("2. Compartir con el cliente")
    print("3. Activar con código y seleccionar impresora")
    print("=" * 60)


if __name__ == '__main__':
    # Si se pasa argumento "debug", compilar con consola
    con_consola = 'debug' in [arg.lower() for arg in sys.argv]
    compilar(con_consola=con_consola)

