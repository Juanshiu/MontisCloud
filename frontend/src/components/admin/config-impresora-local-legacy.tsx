'use client';

import { useEffect, useState } from 'react';
import { Printer, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { printingService } from '@/services/printingService';

export default function ConfigImpresoraLocalLegacy() {
  const [pluginStatus, setPluginStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [testingPrinter, setTestingPrinter] = useState(false);
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');
  const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large'>('normal');

  useEffect(() => {
    checkPlugin();

    const savedPrinter = localStorage.getItem('printer_cocina_local');
    if (savedPrinter) setSelectedPrinter(savedPrinter);

    const savedPaperWidth = localStorage.getItem('paper_width_cocina') as '58mm' | '80mm';
    if (savedPaperWidth) setPaperWidth(savedPaperWidth);

    const savedFontSize = localStorage.getItem('font_size_cocina') as 'small' | 'normal' | 'large';
    if (savedFontSize) setFontSize(savedFontSize);
  }, []);

  const checkPlugin = async () => {
    setPluginStatus('checking');
    const isOnline = await printingService.checkStatus();
    setPluginStatus(isOnline ? 'online' : 'offline');

    if (isOnline) {
      const printerList = await printingService.getPrinters();
      setPrinters(printerList);
    }
  };

  const handlePrinterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const printer = e.target.value;
    setSelectedPrinter(printer);
    localStorage.setItem('printer_cocina_local', printer);
  };

  const handlePaperWidthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const width = e.target.value as '58mm' | '80mm';
    setPaperWidth(width);
    localStorage.setItem('paper_width_cocina', width);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = e.target.value as 'small' | 'normal' | 'large';
    setFontSize(size);
    localStorage.setItem('font_size_cocina', size);
  };

  const testPrinter = async () => {
    if (!selectedPrinter) return;

    setTestingPrinter(true);

    const anchoBase = paperWidth === '58mm' ? 32 : 48;
    const anchoCaracteres = fontSize === 'large' ? Math.floor(anchoBase / 2) : anchoBase;
    const separador = '='.repeat(anchoCaracteres);

    const fontSizeCmd = fontSize === 'small' ? '\x1D\x21\x00' :
      fontSize === 'large' ? '\x1D\x21\x11' :
      '\x1D\x21\x00';

    const content = `${fontSizeCmd}
${separador}
${'PRUEBA DE IMPRESION'.padStart((anchoCaracteres + 19) / 2)}
${separador}
La impresora ${selectedPrinter}
esta configurada correctamente.

Ancho: ${paperWidth} (${anchoCaracteres} car.)
Fuente: ${fontSize === 'small' ? 'Pequeña' : fontSize === 'large' ? 'Grande' : 'Normal'}
Fecha: ${new Date().toLocaleString()}
${separador}
    `;

    await printingService.printRaw(content, selectedPrinter);
    setTestingPrinter(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-secondary-900 flex items-center gap-2">
          <Printer size={20} className="text-primary-600" />
          Configuración de Impresora Local (Legacy)
        </h3>
        <button
          onClick={checkPlugin}
          className="p-2 text-secondary-500 hover:text-primary-600 hover:bg-secondary-50 rounded-full transition-colors"
          title="Verificar conexión"
        >
          <RefreshCw size={18} className={pluginStatus === 'checking' ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="space-y-6">
        <div className={`p-4 rounded-lg border ${
          pluginStatus === 'online' ? 'bg-green-50 border-green-200' :
          pluginStatus === 'offline' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            {pluginStatus === 'online' ? (
              <CheckCircle className="text-green-600" size={24} />
            ) : pluginStatus === 'offline' ? (
              <XCircle className="text-red-600" size={24} />
            ) : (
              <RefreshCw className="text-gray-400 animate-spin" size={24} />
            )}
            <div>
              <p className="font-medium text-secondary-900">
                {pluginStatus === 'online' ? 'Plugin de Impresión Conectado' :
                  pluginStatus === 'offline' ? 'Plugin No Detectado' : 'Verificando conexión...'}
              </p>
              <p className="text-sm text-secondary-600">
                {pluginStatus === 'online'
                  ? 'El sistema puede enviar impresiones locales.'
                  : 'Solo aplica para impresión local legacy en este equipo.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Seleccionar Impresora
            </label>
            <div className="flex gap-2">
              <select
                value={selectedPrinter}
                onChange={handlePrinterChange}
                disabled={pluginStatus !== 'online'}
                className="block w-full rounded-lg border-secondary-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-100"
              >
                <option value="">-- Seleccione una impresora --</option>
                {printers.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button
                onClick={testPrinter}
                disabled={!selectedPrinter || testingPrinter || pluginStatus !== 'online'}
                className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 disabled:opacity-50 font-medium"
              >
                {testingPrinter ? '...' : 'Probar'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Ancho de Papel</label>
            <select
              value={paperWidth}
              onChange={handlePaperWidthChange}
              className="block w-full rounded-lg border-secondary-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="58mm">58mm (POS pequeño)</option>
              <option value="80mm">80mm (POS estándar)</option>
            </select>
            <p className="text-xs text-secondary-500 mt-1">
              {(() => {
                const anchoBase = paperWidth === '58mm' ? 32 : 48;
                const anchoReal = fontSize === 'large' ? Math.floor(anchoBase / 2) : anchoBase;
                return fontSize === 'large' ? `${anchoReal} caracteres (fuente grande)` : `${anchoBase} caracteres`;
              })()}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Tamaño de Fuente</label>
          <select
            value={fontSize}
            onChange={handleFontSizeChange}
            className="block w-full rounded-lg border-secondary-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="small">Pequeña (más líneas)</option>
            <option value="normal">Normal (recomendado)</option>
            <option value="large">Grande (más legible)</option>
          </select>
          <p className="text-xs text-secondary-500 mt-1">
            {fontSize === 'small' ? 'Compacto' : fontSize === 'large' ? 'Texto ampliado' : 'Tamaño estándar'}
          </p>
        </div>
      </div>
    </div>
  );
}
