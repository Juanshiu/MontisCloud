'use client';

import { useState, useEffect, useMemo } from 'react';
import { FileText, Building2, Printer, RefreshCw } from 'lucide-react';
import apiService from '@/services/api';
import { ConfiguracionFacturacion, FormularioComanda } from '@/types';
import { generateComandaReceipt } from '@/utils/receiptFormatter';

export default function GestionFacturacion() {
  const [config, setConfig] = useState<ConfiguracionFacturacion | null>(null);
  const [loading, setLoading] = useState(true);

  // Impresión remota (agente)
  const [remotePrinters, setRemotePrinters] = useState<any[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [newPrinterName, setNewPrinterName] = useState('');
  const [registeringRemote, setRegisteringRemote] = useState(false);
  const [pairingInfo, setPairingInfo] = useState<{ activationCode: string; expiresAt: string } | null>(null);
  const [pairingTimeLeftMs, setPairingTimeLeftMs] = useState<number | null>(null);
  const [selectedRemotePrinterId, setSelectedRemotePrinterId] = useState<string>('');
  const [remoteJobs, setRemoteJobs] = useState<any[]>([]);
  const [remoteTesting, setRemoteTesting] = useState(false);
  
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');
  const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large'>('normal');

  useEffect(() => {
    cargarConfiguracion();
    cargarImpresorasRemotas();
  }, []);

  useEffect(() => {
    if (!pairingInfo?.expiresAt) {
      setPairingTimeLeftMs(null);
      return;
    }

    const updateTimeLeft = () => {
      const expiresAtMs = new Date(pairingInfo.expiresAt).getTime();
      setPairingTimeLeftMs(Math.max(0, expiresAtMs - Date.now()));
    };

    updateTimeLeft();
    const interval = window.setInterval(updateTimeLeft, 1000);
    return () => window.clearInterval(interval);
  }, [pairingInfo]);

  const pairingExpired = pairingTimeLeftMs !== null && pairingTimeLeftMs <= 0;

  const formatTimeLeft = (ms: number | null): string => {
    if (ms === null) return '';
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const comandaPreviewText = useMemo(() => {
    const previewFormulario: FormularioComanda = {
      tipo_pedido: 'mesa',
      mesas: [
        { id: 'preview-mesa-1', numero: '12', capacidad: 4, salon: 'Principal', ocupada: true }
      ],
      items: [
        {
          id: 'preview-item-1',
          producto: {
            id: 'preview-prod-1',
            nombre: 'Bandeja Especial',
            precio: 28500,
            categoria: 'almuerzo',
            disponible: true
          },
          cantidad: 2,
          precio_unitario: 28500,
          subtotal: 57000,
          personalizacion: {
            adicion_proteina: 'pollo_extra',
            termino: 'bien_asado'
          },
          observaciones: 'Una sin picante, por favor.'
        },
        {
          id: 'preview-item-2',
          producto: {
            id: 'preview-prod-2',
            nombre: 'Jugo de Mora',
            precio: 7000,
            categoria: 'bebida',
            disponible: true
          },
          cantidad: 1,
          precio_unitario: 7000,
          subtotal: 7000
        }
      ],
      observaciones_generales: 'Mesa con cliente alérgico a frutos secos.'
    };

    const rawReceipt = generateComandaReceipt(
      previewFormulario,
      'Mesero de Prueba',
      (personalizacion: any) => {
        const entries = Object.entries(personalizacion || {});
        return entries as Array<[string, any]>;
      },
      (catId: string, itemId: string) => {
        const catalogo: Record<string, Record<string, { item: string }>> = {
          adicion_proteina: {
            pollo_extra: { item: '+ Pollo extra (+$4.000)' }
          },
          termino: {
            bien_asado: { item: '+ Término: bien asado (+$0)' }
          }
        };

        return catalogo?.[catId]?.[itemId] || null;
      },
      false,
      false,
      paperWidth,
      fontSize
    );

    return rawReceipt
      .replace(/^\x1D\x21\x00/, '')
      .replace(/^\x1D\x21\x11/, '')
      .replace(/^\x1D\x21\x22/, '')
      .replace(/[\x00-\x08\x0B-\x1F\x7F]/g, '')
      .replace(/^!\s*\n/, '')
      .trim();
  }, [paperWidth, fontSize]);

  const comandaPreviewPaperWidthPx = useMemo(() => {
    return paperWidth === '58mm' ? 300 : 430;
  }, [paperWidth]);

  const comandaPreviewFontClass = useMemo(() => {
    if (fontSize === 'large') return 'text-sm';
    if (fontSize === 'small') return 'text-[11px]';
    return 'text-xs';
  }, [fontSize]);

  const cargarImpresorasRemotas = async () => {
    try {
      setRemoteLoading(true);
      const printers = await apiService.listRemotePrinters();
      setRemotePrinters(printers);

      if (!selectedRemotePrinterId && printers?.[0]?.id) {
        setSelectedRemotePrinterId(printers[0].id);
      }

      const selected = printers?.find((p: any) => p.id === (selectedRemotePrinterId || printers?.[0]?.id));
      const meta = selected?.meta || {};
      if (meta?.paperWidth) setPaperWidth(meta.paperWidth);
      if (meta?.fontSize) setFontSize(meta.fontSize);
    } catch (e) {
      // Silencioso: si no hay permiso o no existe feature, no bloqueamos la vista
      console.error('Error cargando impresoras remotas:', e);
    } finally {
      setRemoteLoading(false);
    }
  };

  const generarCodigoActivacion = async () => {
    if (!newPrinterName.trim()) return;
    try {
      setRegisteringRemote(true);
      setPairingInfo(null);
      const data = await apiService.createRemotePairingToken({
        alias: newPrinterName.trim(),
        ttlMinutes: 10
      });
      setPairingInfo(data);
      setNewPrinterName('');
      await cargarImpresorasRemotas();
    } catch (e) {
      console.error('Error generando código de activación:', e);
    } finally {
      setRegisteringRemote(false);
    }
  };

  const cargarColaRemota = async () => {
    if (!selectedRemotePrinterId) return;
    try {
      const jobs = await apiService.listRemotePrintJobs({ printerId: selectedRemotePrinterId, status: 'pending', limit: 20 });
      setRemoteJobs(jobs);
    } catch (e) {
      console.error('Error cargando cola remota:', e);
    }
  };

  const eliminarImpresoraRemota = async (printerId: string) => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm('¿Eliminar esta impresora? Esto también eliminará su cola de jobs.')
      if (!ok) return
    }

    try {
      await apiService.deleteRemotePrinter(printerId)
      if (selectedRemotePrinterId === printerId) {
        setSelectedRemotePrinterId('')
      }
      await cargarImpresorasRemotas()
    } catch (e) {
      console.error('Error eliminando impresora remota:', e)
    }
  }

  const handleRemotePaperWidthChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const width = e.target.value as '58mm' | '80mm';
    setPaperWidth(width);
    if (!selectedRemotePrinterId) return;
    try {
      await apiService.updateRemotePrinterConfig(selectedRemotePrinterId, { paperWidth: width });
      await cargarImpresorasRemotas();
    } catch (err) {
      console.error('Error actualizando paperWidth remoto:', err);
    }
  };

  const handleRemoteFontSizeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = e.target.value as 'small' | 'normal' | 'large';
    setFontSize(size);
    if (!selectedRemotePrinterId) return;
    try {
      await apiService.updateRemotePrinterConfig(selectedRemotePrinterId, { fontSize: size });
      await cargarImpresorasRemotas();
    } catch (err) {
      console.error('Error actualizando fontSize remoto:', err);
    }
  };

  const testRemotePrinter = async () => {
    if (!selectedRemotePrinterId) return;
    setRemoteTesting(true);
    try {
      const anchoBase = paperWidth === '58mm' ? 32 : 48;
      const anchoCaracteres = fontSize === 'large' ? Math.floor(anchoBase / 2) : anchoBase;
      const separador = '='.repeat(anchoCaracteres);
      const content = `${separador}
${'PRUEBA DE IMPRESION'.padStart(Math.floor((anchoCaracteres + 19) / 2))}
${separador}
Impresion remota OK

Ancho: ${paperWidth} (${anchoCaracteres} car.)
Fuente: ${fontSize === 'small' ? 'Pequeña' : fontSize === 'large' ? 'Grande' : 'Normal'}
Fecha: ${new Date().toLocaleString()}
${separador}
`;

      await apiService.createRemoteTestPrint(selectedRemotePrinterId, {
        raw_text: content,
        __format: { paperWidth, fontSize }
      });
    } catch (err) {
      console.error('Error enviando test remoto:', err);
    } finally {
      setRemoteTesting(false);
    }
  };

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      const data = await apiService.getConfiguracionFacturacion();
      setConfig(data);
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Cargando vista previa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Configuración de Impresión - Vista Previa de Facturación</h2>
            <p className="text-blue-100 text-sm">
              En esta sección puedes configurar los datos que aparecerán en tus facturas y recibos, así como gestionar las impresoras conectadas a través de nuestro sistema de impresión remota.
            </p>
          </div>
        </div>
      </div>

      {/* Impresión Remota (Agente) */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-secondary-900 flex items-center gap-2">
            <Printer size={20} className="text-primary-600" />
            Impresión Remota (Agente en PC de Cocina)
          </h3>
          <button
            onClick={cargarImpresorasRemotas}
            className="p-2 text-secondary-500 hover:text-primary-600 hover:bg-secondary-50 rounded-full transition-colors"
            title="Actualizar listado"
          >
            <RefreshCw size={18} className={remoteLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-secondary-700 mb-1">Alias de impresora (ej: Cocina Principal)</label>
              <input
                value={newPrinterName}
                onChange={(e) => setNewPrinterName(e.target.value)}
                className="block w-full rounded-lg border-secondary-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Ej: Cocina Principal"
              />
            </div>
            <div className="flex items-end gap-3">
              <button
                onClick={generarCodigoActivacion}
                disabled={!newPrinterName.trim() || registeringRemote}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
              >
                {registeringRemote ? '...' : 'Generar código'}
              </button>
            </div>
          </div>

          {pairingInfo && (
            <div className={`rounded-lg p-3 text-sm border ${pairingExpired ? 'bg-red-50 border-red-200 text-red-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
              <p className="font-semibold">Código de activación (válido 10 minutos):</p>
              <p className="mt-1 text-lg tracking-wide"><strong>{pairingInfo.activationCode}</strong></p>
              <p className="mt-1 text-xs">Expira: {new Date(pairingInfo.expiresAt).toLocaleString()}</p>
              {!pairingExpired && (
                <p className="mt-1 text-xs font-semibold">Tiempo restante: {formatTimeLeft(pairingTimeLeftMs)}</p>
              )}
              {pairingExpired && (
                <div className="mt-2 bg-red-100 border border-red-200 rounded-md p-2 text-xs">
                  Este código ya expiró. Genera un nuevo código para continuar la activación en el agente.
                </div>
              )}
              <p className="mt-2 text-xs text-amber-800">
                El cliente solo debe abrir <strong>montis-printer-agent.exe</strong> e ingresar este código.
              </p>
            </div>
          )}

          <div className="border border-secondary-200 rounded-lg overflow-hidden">
            <div className="bg-secondary-50 px-4 py-2 text-sm font-medium text-secondary-700">Impresoras registradas</div>
            <div className="p-4 space-y-3">
              {remotePrinters.length === 0 ? (
                <p className="text-sm text-secondary-500">No hay impresoras registradas en la nube para esta empresa.</p>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-secondary-700">Seleccionar</label>
                      <select
                        value={selectedRemotePrinterId}
                        onChange={(e) => setSelectedRemotePrinterId(e.target.value)}
                        className="rounded-lg border-secondary-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      >
                        {remotePrinters.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}{p.is_default ? ' (default)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={cargarColaRemota}
                        disabled={!selectedRemotePrinterId}
                        className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 disabled:opacity-50 font-medium"
                      >
                        Ver cola (pending)
                      </button>
                      <button
                        onClick={testRemotePrinter}
                        disabled={!selectedRemotePrinterId || remoteTesting}
                        className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 disabled:opacity-50 font-medium"
                      >
                        {remoteTesting ? '...' : 'Probar'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Ancho de Papel</label>
                      <select
                        value={paperWidth}
                        onChange={handleRemotePaperWidthChange}
                        disabled={!selectedRemotePrinterId}
                        className="block w-full rounded-lg border-secondary-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-100"
                      >
                        <option value="58mm">58mm (POS pequeño)</option>
                        <option value="80mm">80mm (POS estándar)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Tamaño de Fuente</label>
                      <select
                        value={fontSize}
                        onChange={handleRemoteFontSizeChange}
                        disabled={!selectedRemotePrinterId}
                        className="block w-full rounded-lg border-secondary-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-100"
                      >
                        <option value="small">Pequeña (más líneas)</option>
                        <option value="normal">Normal (recomendado)</option>
                        <option value="large">Grande (más legible)</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <div className="text-xs text-secondary-500">
                        {(() => {
                          const anchoBase = paperWidth === '58mm' ? 32 : 48;
                          const anchoReal = fontSize === 'large' ? Math.floor(anchoBase / 2) : anchoBase;
                          return fontSize === 'large' ? `${anchoReal} caracteres (fuente grande)` : `${anchoBase} caracteres`;
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {remotePrinters.map((p) => {
                      const lastSeen = p.last_seen_at ? new Date(p.last_seen_at) : null;
                      const online = lastSeen ? (Date.now() - lastSeen.getTime() < 90_000) : false;
                      const windowsPrinterName = p?.meta?.printer_name || p?.meta?.printerName || null;
                      return (
                        <div key={p.id} className="flex items-center justify-between text-sm border border-secondary-200 rounded-lg px-3 py-2">
                          <div>
                            <p className="font-medium text-secondary-900">{p.name}</p>
                            {windowsPrinterName ? (
                              <p className="text-xs text-secondary-500">Impresora Windows: {windowsPrinterName}</p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className={`font-medium ${online ? 'text-green-700' : 'text-secondary-500'}`}>
                                {online ? 'ONLINE' : 'OFFLINE'}
                              </p>
                              <p className="text-xs text-secondary-500">
                                {lastSeen ? `Último: ${lastSeen.toLocaleString()}` : 'Sin heartbeat'}
                              </p>
                            </div>
                            <button
                              onClick={() => eliminarImpresoraRemota(p.id)}
                              className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 text-xs font-medium"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {remoteJobs.length > 0 && (
                    <div className="mt-3 bg-secondary-50 border border-secondary-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-secondary-800">Jobs pendientes ({remoteJobs.length})</p>
                      <div className="mt-2 space-y-2 text-xs">
                        {remoteJobs.map((j) => (
                          <div key={j.id} className="flex items-center justify-between bg-white border border-secondary-200 rounded px-2 py-1">
                            <span className="truncate">{j.external_id}</span>
                            <span className="text-secondary-500">{j.created_at ? new Date(j.created_at).toLocaleTimeString() : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p>
              La impresión remota funciona cuando un PC (normalmente el PC donde tiene conectado la impresora) ejecuta el agente y mantiene la conexión activa.
              Las comandas se encolan desde el sistema automáticamente.
            </p>
          </div>
        </div>
      </div>

      {/* Vista previa Estilo Recibo */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-8">
        <h3 className="text-lg font-bold text-secondary-900 mb-6 flex items-center gap-2">
            <FileText size={20} className="text-primary-600" />
        Diseño de Encabezado (Recibo/Factura) y Comanda de Cocina
        </h3>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-center gap-3 text-yellow-800">
        <Building2 size={20} className="flex-shrink-0" />
        <p className="text-sm">
          Para modificar estos datos, diríjase a la sección de <strong>Empresa</strong> en el menú lateral.
        </p>
      </div>
        
        <div className="max-w-md mx-auto bg-white border-2 border-dashed border-secondary-300 rounded-lg p-8 font-mono text-sm shadow-inner relative overflow-hidden">
          {/* Sello de agua simulado */}
          <div className="absolute top-0 right-0 p-2 opacity-10">
             <Building2 size={64} />
          </div>

          <div className="text-center space-y-2 relative z-10">
            <div className="text-lg font-black tracking-tighter uppercase">{config?.nombre_empresa || 'NOMBRE EMPRESA'}</div>
            <div className="font-bold">NIT: {config?.nit || 'NIT'}</div>
            
            <div className="py-1 border-y border-secondary-200 text-[10px] uppercase font-bold tracking-widest">
                {config?.responsable_iva ? 'RESPONSABLE DE IVA' : 'NO RESPONSABLE DE IVA'}
            </div>

            {config?.responsable_iva && config?.porcentaje_iva && (
              <div className="text-xs uppercase">IVA INC.: {config.porcentaje_iva}%</div>
            )}
            
            <div className="pt-2">
                <div className="font-bold">{config?.direccion || 'DIRECCIÓN'}</div>
                <div>
                  {config?.departamento && config?.ciudad 
                    ? `${config.departamento} - ${config.ciudad}`
                    : config?.ubicacion_geografica || 'UBICACIÓN'}
                </div>
                <div className="font-bold">
                  TEL: {(() => {
                    const tels = [];
                    if (config?.telefonos?.[0]) tels.push(config.telefonos[0]);
                    if (config?.telefono2?.trim()) tels.push(config.telefono2);
                    return tels.length > 0 ? tels.join(' - ') : 'TELÉFONOS';
                  })()}
                </div>
            </div>

            <div className="mt-8 pt-4 border-t-2 border-dotted border-secondary-300">
                <div className="grid grid-cols-[auto_1fr_auto_auto] gap-1 font-bold text-xs">
                    <span>CANT</span>
                    <span>DESCRIPCIÓN</span>
                    <span>V.UNIT</span>
                    <span>TOTAL</span>
                </div>
                <div className="mt-2 text-center text-secondary-400 italic text-[10px]">
                    ... detalle de la venta ...
        </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-secondary-200 pt-6">
          <h4 className="text-base font-bold text-secondary-900 mb-3 flex items-center gap-2">
            <Printer size={18} className="text-primary-600" />
            Vista previa de Comanda para Cocina
          </h4>
          <p className="text-xs text-secondary-600 mb-3">
            Esta vista usa el mismo formateador de comandas que recibe la impresora de cocina, respetando ancho de papel y tamaño de fuente seleccionados.
          </p>
          <div
            className="mx-auto bg-white border-2 border-dashed border-secondary-300 rounded-lg p-4 shadow-inner"
            style={{ width: `${comandaPreviewPaperWidthPx}px`, maxWidth: '100%' }}
          >
            <pre className={`text-black whitespace-pre-wrap overflow-x-auto font-mono leading-relaxed text-left ${comandaPreviewFontClass}`}>
              {comandaPreviewText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
