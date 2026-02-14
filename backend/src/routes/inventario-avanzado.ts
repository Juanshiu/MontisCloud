import { Router, Request, Response } from 'express';
import { db } from '../database/database';
import * as XLSX from 'xlsx';
import { sql } from 'kysely';
import { verificarAutenticacion } from '../middleware/authMiddleware';

const router = Router();

router.use(verificarAutenticacion);

const UNIDADES_VALIDAS = ['g', 'kg', 'ml', 'unidad'];

const calcularEstadoInsumo = (stockActual: number, stockMinimo: number, stockCritico: number, cantidadUsada: number = 0) => {
  if (cantidadUsada > 0 && stockActual < cantidadUsada) return 'AGOTADO';
  if (stockActual <= 0) return 'AGOTADO';
  if (stockActual <= stockCritico) return 'CRITICO';
  if (stockActual <= stockMinimo) return 'BAJO';
  return 'OK';
};

const combinarEstadoRiesgo = (estadoActual: string | null, nuevoEstado: string) => {
  if (estadoActual === 'AGOTADO' || nuevoEstado === 'AGOTADO') return 'AGOTADO';
  if (estadoActual === 'CRITICO' || nuevoEstado === 'CRITICO') return 'CRITICO';
  if (estadoActual === 'BAJO' || nuevoEstado === 'BAJO') return 'BAJO';
  return 'OK';
};

const normalizarNumero = (valor: any) => {
  if (valor === null || valor === undefined || valor === '') return null;
  const num = Number(valor);
  return Number.isNaN(num) ? null : num;
};

const parsePersonalizacionesHabilitadas = (valor: any): string[] => {
  if (valor === null || valor === undefined || valor === '') return [];

  const normalizarArray = (arr: any[]): string[] => {
    const limpias = arr
      .map((v) => String(v ?? '').trim())
      .filter(Boolean);
    return Array.from(new Set(limpias));
  };

  if (Array.isArray(valor)) {
    return normalizarArray(valor);
  }

  let texto = String(valor).trim();
  if (!texto) return [];

  for (let i = 0; i < 3; i++) {
    try {
      const parsed = JSON.parse(texto);
      if (Array.isArray(parsed)) {
        return normalizarArray(parsed);
      }
      if (typeof parsed === 'string') {
        texto = parsed.trim();
        continue;
      }
      break;
    } catch {
      break;
    }
  }

  const textoLimpio = texto
    .replace(/^[\[]|[\]]$/g, '')
    .replace(/\\+"/g, '"')
    .replace(/\\+/g, '');

  return normalizarArray(textoLimpio.split(/[,;|]/));
};

const formatearPersonalizacionesParaExcel = (valor: any): string => {
  const lista = parsePersonalizacionesHabilitadas(valor);
  return lista.join(', ');
};

const registrarHistorialInsumo = async (data: {
  empresa_id: string;
  insumo_id: string;
  cantidad: number;
  unidad_medida: string;
  producto_id?: string | null;
  comanda_id?: string | null;
  tipo_evento: string;
  motivo?: string | null;
  usuario_id?: string | null;
  proveedor_id?: string | null;
}, trx?: any) => {
  const client = trx || db;
  await client.insertInto('insumo_historial')
    .values({
      empresa_id: data.empresa_id,
      insumo_id: data.insumo_id,
      cantidad: data.cantidad,
      unidad_medida: data.unidad_medida,
      producto_id: data.producto_id || null,
      comanda_id: data.comanda_id || null,
      tipo_evento: data.tipo_evento,
      motivo: data.motivo || null,
      usuario_id: data.usuario_id || null,
      proveedor_id: data.proveedor_id || null
    })
    .execute();
};

// ===================== AUTO-GENERACIÓN DE SKU =====================

/**
 * Genera el siguiente código SKU disponible para una tabla/empresa.
 * Formato: PREFIJO-NNN (ej: PROD-001, INS-042)
 * Nunca reutiliza números — siempre incrementa sobre el máximo existente.
 */
const generarSiguienteCodigo = async (
  tabla: 'productos' | 'insumos' | 'items_personalizacion' | 'categorias_personalizacion',
  prefijo: string,
  empresaId: string,
  trx?: any
): Promise<string> => {
  const client = trx || db;
  const result = await sql`
    SELECT codigo FROM ${sql.table(tabla)}
    WHERE empresa_id = ${empresaId}
      AND codigo LIKE ${prefijo + '-%'}
    ORDER BY codigo DESC
    LIMIT 1
  `.execute(client);

  let nextNum = 1;
  if ((result.rows as any[]).length > 0) {
    const last = (result.rows as any[])[0].codigo as string;
    const num = parseInt(last.replace(prefijo + '-', ''), 10);
    if (!isNaN(num)) nextNum = num + 1;
  }

  return `${prefijo}-${String(nextNum).padStart(3, '0')}`;
};

const validarInsumo = (data: any) => {
  const errores: string[] = [];

  if (!data.nombre || !String(data.nombre).trim()) {
    errores.push('El nombre es obligatorio');
  }

  if (!data.unidad_medida || !UNIDADES_VALIDAS.includes(String(data.unidad_medida))) {
    errores.push(`Unidad de medida inválida. Use: ${UNIDADES_VALIDAS.join(', ')}`);
  }

  const stockActual = normalizarNumero(data.stock_actual);
  const stockMinimo = normalizarNumero(data.stock_minimo);
  const stockCritico = normalizarNumero(data.stock_critico);

  if (stockActual === null || stockActual < 0) {
    errores.push('stock_actual debe ser un número mayor o igual a 0');
  }
  if (stockMinimo === null || stockMinimo < 0) {
    errores.push('stock_minimo debe ser un número mayor o igual a 0');
  }
  if (stockCritico === null || stockCritico < 0) {
    errores.push('stock_critico debe ser un número mayor o igual a 0');
  }
  if (stockMinimo !== null && stockCritico !== null && stockCritico > stockMinimo) {
    errores.push('stock_critico no puede ser mayor que stock_minimo');
  }

  return { errores, stockActual, stockMinimo, stockCritico };
};

// ===================== INSUMOS =====================

router.get('/insumos', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const rows = await db.selectFrom('insumos as i')
      .leftJoin('insumo_categorias as ic', 'i.categoria_id', 'ic.id')
      .select([
        'i.id', 'i.empresa_id', 'i.codigo', 'i.nombre', 'i.unidad_medida', 
        'i.stock_actual', 'i.stock_minimo', 'i.stock_critico', 
        'i.costo_unitario', 'i.categoria_id', 'i.activo', 
        'i.created_at', 'i.updated_at',
        'ic.nombre as categoria_nombre'
      ])
      .where('i.empresa_id', '=', empresaId)
      .where('i.activo', '=', true)
      .orderBy('i.nombre', 'asc')
      .execute();

    const insumos = rows.map(row => ({
      ...row,
      estado: calcularEstadoInsumo(Number(row.stock_actual), Number(row.stock_minimo), Number(row.stock_critico))
    }));

    res.json(insumos);
  } catch (error) {
    console.error('Error al obtener insumos:', error);
    res.status(500).json({ error: 'Error al obtener insumos' });
  }
});

router.post('/insumos', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const { nombre, unidad_medida, stock_actual, stock_minimo, stock_critico, costo_unitario, categoria_id } = req.body;
    const validacion = validarInsumo({ nombre, unidad_medida, stock_actual, stock_minimo, stock_critico });

    if (validacion.errores.length > 0) {
      return res.status(400).json({ error: validacion.errores.join(' | ') });
    }

    const codigoAuto = await generarSiguienteCodigo('insumos', 'INS', empresaId);

    const nuevo = await db.insertInto('insumos')
      .values({
        empresa_id: empresaId,
        codigo: codigoAuto,
        nombre: nombre.trim(),
        unidad_medida,
        stock_actual: validacion.stockActual as any,
        stock_minimo: validacion.stockMinimo as any,
        stock_critico: validacion.stockCritico as any,
        costo_unitario: normalizarNumero(costo_unitario) as any,
        categoria_id: categoria_id || null,
        activo: true
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    res.status(201).json({
      ...nuevo,
      estado: calcularEstadoInsumo(Number(nuevo.stock_actual), Number(nuevo.stock_minimo), Number(nuevo.stock_critico))
    });
  } catch (error: any) {
    console.error('Error al crear insumo:', error);
    if (error.constraint === 'insumos_nombre_empresa_unique' || (error.message && error.message.includes('unique'))) {
      return res.status(400).json({ error: 'Ya existe un insumo con ese nombre' });
    }
    res.status(500).json({ error: 'Error al crear insumo' });
  }
});

router.put('/insumos/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    const { nombre, unidad_medida, stock_actual, stock_minimo, stock_critico, costo_unitario, categoria_id, activo } = req.body;
    const validacion = validarInsumo({ nombre, unidad_medida, stock_actual, stock_minimo, stock_critico });

    if (validacion.errores.length > 0) {
      return res.status(400).json({ error: validacion.errores.join(' | ') });
    }

    const actualizado = await db.updateTable('insumos')
      .set({
        nombre: nombre.trim(),
        unidad_medida,
        stock_actual: validacion.stockActual as any,
        stock_minimo: validacion.stockMinimo as any,
        stock_critico: validacion.stockCritico as any,
        costo_unitario: normalizarNumero(costo_unitario) as any,
        categoria_id: categoria_id || null,
        activo: activo !== undefined ? !!activo : undefined,
        updated_at: new Date() as any
      })
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .returningAll()
      .executeTakeFirst();

    if (!actualizado) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    res.json({
      ...actualizado,
      estado: calcularEstadoInsumo(Number(actualizado.stock_actual), Number(actualizado.stock_minimo), Number(actualizado.stock_critico))
    });
  } catch (error: any) {
    console.error('Error al actualizar insumo:', error);
    if (error.constraint === 'insumos_nombre_empresa_unique' || (error.message && error.message.includes('unique'))) {
      return res.status(400).json({ error: 'Ya existe un insumo con ese nombre' });
    }
    res.status(500).json({ error: 'Error al actualizar insumo' });
  }
});

router.delete('/insumos/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;

    // Verificar si se usa en recetas
    const usosProducto = await db.selectFrom('producto_insumos')
      .select(sql<number>`count(*)`.as('count'))
      .where('insumo_id', '=', id)
      .executeTakeFirst();
      
    const usosPersonalizacion = await db.selectFrom('personalizacion_insumos')
      .select(sql<number>`count(*)`.as('count'))
      .where('insumo_id', '=', id)
      .executeTakeFirst();

    if (Number(usosProducto?.count || 0) > 0 || Number(usosPersonalizacion?.count || 0) > 0) {
      return res.status(400).json({ error: 'No se puede eliminar el insumo porque está asociado a recetas' });
    }

    const result = await db.deleteFrom('insumos')
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();
      
    if (Number(result.numDeletedRows) === 0) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }
      
    res.json({ mensaje: 'Insumo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar insumo:', error);
    res.status(500).json({ error: 'Error al eliminar insumo' });
  }
});

// Ajuste manual de stock
router.post('/insumos/:id/ajuste', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    const { cantidad, motivo, usuario_id, proveedor_id } = req.body;

    const cantidadNum = Number(cantidad);
    if (Number.isNaN(cantidadNum) || cantidadNum === 0) {
      return res.status(400).json({ error: 'cantidad debe ser un número diferente de 0' });
    }

    const insumo = await db.selectFrom('insumos')
      .selectAll()
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();

    if (!insumo) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    const stockActual = Number(insumo.stock_actual) || 0;
    const nuevoStock = stockActual + cantidadNum;
    if (nuevoStock < 0) {
      return res.status(400).json({ error: 'El ajuste deja el stock en negativo' });
    }

    await db.transaction().execute(async (trx) => {
      await trx.updateTable('insumos')
        .set({ 
          stock_actual: nuevoStock as any, 
          updated_at: new Date() as any 
        })
        .where('id', '=', id)
        .execute();

      await registrarHistorialInsumo({
        empresa_id: empresaId,
        insumo_id: id,
        cantidad: cantidadNum,
        unidad_medida: insumo.unidad_medida,
        tipo_evento: 'AJUSTE',
        motivo: motivo ? String(motivo) : 'Ajuste manual',
        usuario_id: usuario_id || null,
        proveedor_id: proveedor_id || null
      }, trx);
    });

    const actualizado = await db.selectFrom('insumos')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirstOrThrow();

    res.json({
      ...actualizado,
      estado: calcularEstadoInsumo(Number(actualizado.stock_actual), Number(actualizado.stock_minimo), Number(actualizado.stock_critico))
    });
  } catch (error) {
    console.error('Error al ajustar insumo:', error);
    res.status(500).json({ error: 'Error al ajustar el insumo' });
  }
});

// Historial de movimientos
router.get('/insumos/historial', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const { insumo_id, limit, fecha_inicio, fecha_fin } = req.query;
    const limitNum = Math.min(Math.max(Number(limit) || 100, 1), 1000);

    let query = db.selectFrom('insumo_historial as h')
      .innerJoin('insumos as i', 'h.insumo_id', 'i.id')
      .leftJoin('productos as p', 'h.producto_id', 'p.id')
      .leftJoin('proveedores as prov', 'h.proveedor_id', 'prov.id')
      .selectAll('h')
      .select([
        'i.nombre as insumo_nombre',
        'p.nombre as producto_nombre',
        'prov.nombre as proveedor_nombre'
      ])
      .where('h.empresa_id', '=', empresaId);

    if (insumo_id) {
      query = query.where('h.insumo_id', '=', insumo_id as string);
    }

    if (fecha_inicio) {
      query = query.where(sql`DATE(h.fecha_hora)`, '>=', fecha_inicio as string);
    }

    if (fecha_fin) {
      query = query.where(sql`DATE(h.fecha_hora)`, '<=', fecha_fin as string);
    }

    const rows = await query
      .orderBy('h.fecha_hora', 'desc')
      .limit(limitNum)
      .execute();

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener historial de insumos:', error);
    res.status(500).json({ error: 'Error al obtener historial de insumos' });
  }
});

// Riesgo por insumos en productos
router.get('/riesgo/productos', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const rows = await db.selectFrom('producto_insumos as pi')
      .innerJoin('insumos as i', 'pi.insumo_id', 'i.id')
      .innerJoin('productos as p', 'pi.producto_id', 'p.id')
      .select([
        'pi.producto_id', 'i.stock_actual', 'i.stock_minimo', 
        'i.stock_critico', 'pi.cantidad'
      ])
      .where('i.empresa_id', '=', empresaId)
      .where('i.activo', '=', true)
      .where('p.usa_insumos', '=', true)
      .execute();

    const riesgos = new Map<string, string>();
    rows.forEach(row => {
      const estado = calcularEstadoInsumo(
        Number(row.stock_actual), 
        Number(row.stock_minimo), 
        Number(row.stock_critico), 
        Number(row.cantidad)
      );
      const actual = riesgos.get(row.producto_id) || null;
      riesgos.set(row.producto_id, combinarEstadoRiesgo(actual, estado));
    });

    const respuesta = Array.from(riesgos.entries()).map(([producto_id, estado]) => ({ producto_id, estado }));
    res.json(respuesta);
  } catch (error) {
    console.error('Error al calcular riesgo de productos:', error);
    res.status(500).json({ error: 'Error al calcular riesgo de productos' });
  }
});

// Riesgo por insumos en personalizaciones
router.get('/riesgo/personalizaciones', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const rows = await db.selectFrom('personalizacion_insumos as pi')
      .innerJoin('insumos as i', 'pi.insumo_id', 'i.id')
      .innerJoin('items_personalizacion as ip', 'pi.item_personalizacion_id', 'ip.id')
      .select([
        'pi.item_personalizacion_id', 'i.stock_actual', 'i.stock_minimo', 
        'i.stock_critico', 'pi.cantidad'
      ])
      .where('i.empresa_id', '=', empresaId)
      .where('i.activo', '=', true)
      .where('ip.usa_insumos', '=', true)
      .execute();

    const riesgos = new Map<string, string>();
    rows.forEach(row => {
      const estado = calcularEstadoInsumo(
        Number(row.stock_actual), 
        Number(row.stock_minimo), 
        Number(row.stock_critico), 
        Number(row.cantidad)
      );
      const actual = riesgos.get(row.item_personalizacion_id) || null;
      riesgos.set(row.item_personalizacion_id, combinarEstadoRiesgo(actual, estado));
    });

    const respuesta = Array.from(riesgos.entries()).map(([item_personalizacion_id, estado]) => ({ item_personalizacion_id, estado }));
    res.json(respuesta);
  } catch (error) {
    console.error('Error al calcular riesgo de personalizaciones:', error);
    res.status(500).json({ error: 'Error al calcular riesgo de personalizaciones' });
  }
});

// ===================== RECETAS PRODUCTOS =====================

router.get('/recetas/productos/resumen', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;

    const rows = await db.selectFrom('producto_insumos as pi')
      .innerJoin('productos as p', 'pi.producto_id', 'p.id')
      .innerJoin('insumos as i', 'pi.insumo_id', 'i.id')
      .select([
        'p.id as producto_id',
        'p.codigo as producto_codigo',
        'p.nombre as producto_nombre',
        'pi.insumo_id',
        'pi.cantidad as cantidad_usada',
        'i.nombre as insumo_nombre',
        'i.costo_unitario'
      ])
      .where('pi.empresa_id', '=', empresaId)
      .where('p.empresa_id', '=', empresaId)
      .orderBy('p.nombre', 'asc')
      .orderBy('i.nombre', 'asc')
      .execute();

    const resumenMap = new Map<string, {
      producto_id: string;
      producto_codigo: string | null;
      producto_nombre: string;
      cantidad_insumos: number;
      costo_total_receta: number;
      insumos: string[];
      insumosSet: Set<string>;
    }>();

    for (const row of rows) {
      const actual = resumenMap.get(row.producto_id) || {
        producto_id: row.producto_id,
        producto_codigo: row.producto_codigo,
        producto_nombre: row.producto_nombre,
        cantidad_insumos: 0,
        costo_total_receta: 0,
        insumos: [],
        insumosSet: new Set<string>()
      };

      const costoFila = Number(row.costo_unitario || 0) * Number(row.cantidad_usada || 0);
      actual.costo_total_receta += costoFila;

      if (!actual.insumosSet.has(row.insumo_id)) {
        actual.insumosSet.add(row.insumo_id);
        actual.insumos.push(row.insumo_nombre);
        actual.cantidad_insumos += 1;
      }

      resumenMap.set(row.producto_id, actual);
    }

    const resumen = Array.from(resumenMap.values())
      .map(({ insumosSet, ...item }) => ({ ...item }))
      .sort((a, b) => a.producto_nombre.localeCompare(b.producto_nombre));

    res.json(resumen);
  } catch (error) {
    console.error('Error al obtener resumen de recetas:', error);
    res.status(500).json({ error: 'Error al obtener resumen de recetas' });
  }
});

router.get('/recetas/productos/:productoId', async (req: Request, res: Response) => {
  try {
    const { productoId } = req.params;
    const { empresaId } = req.context;

    const rows = await db.selectFrom('producto_insumos as pi')
      .innerJoin('insumos as i', 'pi.insumo_id', 'i.id')
      .select(['pi.id', 'pi.producto_id', 'pi.insumo_id', 'pi.cantidad as cantidad_usada', 'i.nombre as insumo_nombre', 'i.unidad_medida'])
      .where('pi.producto_id', '=', productoId)
      .where('i.empresa_id', '=', empresaId)
      .orderBy('i.nombre', 'asc')
      .execute();

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener receta:', error);
    res.status(500).json({ error: 'Error al obtener receta del producto' });
  }
});

router.put('/recetas/productos/:productoId', async (req: Request, res: Response) => {
  try {
    const { productoId } = req.params;
    const { items } = req.body;
    const { empresaId } = req.context;

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items debe ser un array' });
    }

    const recetas = items.map((item: any) => ({
      empresa_id: empresaId,
      producto_id: productoId,
      insumo_id: item.insumo_id,
      cantidad: Number(item.cantidad_usada)
    })).filter(r => r.insumo_id && r.cantidad > 0);

    await db.transaction().execute(async (trx) => {
      await trx.deleteFrom('producto_insumos')
        .where('producto_id', '=', productoId)
        .where('empresa_id', '=', empresaId)
        .execute();

      if (recetas.length > 0) {
        await trx.insertInto('producto_insumos')
          .values(recetas)
          .execute();
      }
    });

    res.json({ mensaje: 'Receta actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar receta:', error);
    res.status(500).json({ error: 'Error al actualizar receta del producto' });
  }
});

// ===================== AJUSTES PERSONALIZACIONES =====================

router.get('/recetas/personalizaciones/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { empresaId } = req.context;

    const rows = await db.selectFrom('personalizacion_insumos as pi')
      .innerJoin('insumos as i', 'pi.insumo_id', 'i.id')
      .select(['pi.item_personalizacion_id', 'pi.insumo_id', 'pi.cantidad as cantidad_ajuste', 'i.nombre as insumo_nombre', 'i.unidad_medida'])
      .where('pi.item_personalizacion_id', '=', itemId)
      .where('i.empresa_id', '=', empresaId)
      .orderBy('i.nombre', 'asc')
      .execute();

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener ajustes:', error);
    res.status(500).json({ error: 'Error al obtener ajustes de personalización' });
  }
});

router.put('/recetas/personalizaciones/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { items } = req.body;
    const { empresaId } = req.context;

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items debe ser un array' });
    }

    const ajustes = items.map((item: any) => ({
      empresa_id: empresaId,
      item_personalizacion_id: itemId,
      insumo_id: item.insumo_id,
      cantidad: Number(item.cantidad_ajuste)
    })).filter(a => a.insumo_id && a.cantidad !== 0);

    await db.transaction().execute(async (trx) => {
      await trx.deleteFrom('personalizacion_insumos')
        .where('item_personalizacion_id', '=', itemId)
        .where('empresa_id', '=', empresaId)
        .execute();

      if (ajustes.length > 0) {
        await trx.insertInto('personalizacion_insumos')
          .values(ajustes)
          .execute();
      }
    });

    res.json({ mensaje: 'Ajustes actualizados exitosamente' });
  } catch (error) {
    console.error('Error al actualizar ajustes:', error);
    res.status(500).json({ error: 'Error al actualizar ajustes de personalización' });
  }
});

// ===================== IMPORT / EXPORT =====================

router.get('/insumos/export', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const insumos = await db.selectFrom('insumos as i')
      .leftJoin('insumo_categorias as ic', 'i.categoria_id', 'ic.id')
      .select([
        'i.codigo',
        'i.nombre',
        'i.unidad_medida',
        'i.stock_actual',
        'i.stock_minimo',
        'i.stock_critico',
        'i.costo_unitario',
        'ic.nombre as categoria',
        'i.activo'
      ])
      .where('i.empresa_id', '=', empresaId)
      .orderBy('i.codigo', 'asc')
      .execute();

    const worksheet = XLSX.utils.json_to_sheet(insumos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Insumos');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="insumos.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Error al exportar insumos:', error);
    res.status(500).json({ error: 'Error al exportar insumos' });
  }
});

router.post('/insumos/import', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const { fileBase64 } = req.body;
    
    if (!fileBase64) {
      return res.status(400).json({ error: 'fileBase64 es requerido' });
    }

    const buffer = Buffer.from(fileBase64, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    if (rows.length === 0) {
      return res.status(400).json({ error: 'El archivo no contiene datos' });
    }

    // Cargar categorías existentes para mapeo por nombre
    const categorias = await db.selectFrom('insumo_categorias')
      .select(['id', 'nombre'])
      .where('empresa_id', '=', empresaId)
      .execute();
    const catMap = new Map(categorias.map(c => [c.nombre.toLowerCase(), c.id]));

    // Detectar códigos duplicados dentro del mismo Excel
    const codigosEnExcel = rows.map(r => r.codigo?.toString().trim()).filter(Boolean);
    const duplicadosExcel = codigosEnExcel.filter((c, i) => codigosEnExcel.indexOf(c) !== i);

    const errores: { fila: number; mensaje: string }[] = [];
    let creados = 0;
    let actualizados = 0;

    await db.transaction().execute(async (trx) => {
      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        const fila = idx + 2; // +2 por header + 0-index

        // Validar nombre obligatorio
        if (!row.nombre || !String(row.nombre).trim()) {
          errores.push({ fila, mensaje: 'Nombre es obligatorio' });
          continue;
        }

        const validacion = validarInsumo({
          nombre: row.nombre,
          unidad_medida: row.unidad_medida,
          stock_actual: row.stock_actual,
          stock_minimo: row.stock_minimo,
          stock_critico: row.stock_critico
        });

        if (validacion.errores.length > 0) {
          errores.push({ fila, mensaje: validacion.errores.join('; ') });
          continue;
        }

        const nombre = String(row.nombre).trim();
        const codigoRaw = row.codigo?.toString().trim() || '';

        // Verificar código duplicado dentro del Excel
        if (codigoRaw && duplicadosExcel.includes(codigoRaw)) {
          errores.push({ fila, mensaje: `Código "${codigoRaw}" duplicado en el archivo` });
          continue;
        }
        
        // Resolver categoría por nombre
        let categoriaId: string | null = null;
        if (row.categoria) {
          categoriaId = catMap.get(String(row.categoria).toLowerCase()) || null;
          if (!categoriaId) {
            errores.push({ fila, mensaje: `Categoría "${row.categoria}" no encontrada` });
            continue;
          }
        }

        // Buscar registro existente por (empresa_id + codigo) o (empresa_id + nombre)
        let existente: any = null;
        if (codigoRaw) {
          existente = await trx.selectFrom('insumos')
            .select(['id', 'codigo'])
            .where('empresa_id', '=', empresaId)
            .where('codigo', '=', codigoRaw)
            .executeTakeFirst();
        }
        if (!existente) {
          existente = await trx.selectFrom('insumos')
            .select(['id', 'codigo'])
            .where('empresa_id', '=', empresaId)
            .where('nombre', '=', nombre)
            .executeTakeFirst();
        }

        if (existente) {
          await trx.updateTable('insumos')
            .set({
              nombre,
              unidad_medida: String(row.unidad_medida).trim(),
              stock_actual: validacion.stockActual as any,
              stock_minimo: validacion.stockMinimo as any,
              stock_critico: validacion.stockCritico as any,
              costo_unitario: normalizarNumero(row.costo_unitario) as any,
              categoria_id: categoriaId,
              activo: row.activo !== false && row.activo !== 0 && row.activo !== 'false',
              updated_at: new Date() as any
            })
            .where('id', '=', existente.id)
            .execute();
          actualizados++;
        } else {
          const nuevoCodigo = codigoRaw || await generarSiguienteCodigo('insumos', 'INS', empresaId, trx);
          await trx.insertInto('insumos')
            .values({
              empresa_id: empresaId,
              codigo: nuevoCodigo,
              nombre,
              unidad_medida: String(row.unidad_medida).trim(),
              stock_actual: validacion.stockActual as any,
              stock_minimo: validacion.stockMinimo as any,
              stock_critico: validacion.stockCritico as any,
              costo_unitario: normalizarNumero(row.costo_unitario) as any,
              categoria_id: categoriaId,
              activo: row.activo !== false && row.activo !== 0 && row.activo !== 'false'
            })
            .execute();
          creados++;
        }
      }
    });

    res.json({ 
      mensaje: `Importación completada: ${creados} creados, ${actualizados} actualizados`,
      creados,
      actualizados,
      errores: errores.length > 0 ? errores : undefined
    });
  } catch (error) {
    console.error('Error al importar insumos:', error);
    res.status(500).json({ error: 'Error al importar insumos' });
  }
});

router.get('/recetas/export', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    
    const recetas = await db.selectFrom('producto_insumos as pi')
      .innerJoin('productos as p', 'pi.producto_id', 'p.id')
      .innerJoin('insumos as i', 'pi.insumo_id', 'i.id')
      .select([
        'p.codigo as producto_codigo', 'p.nombre as producto_nombre', 
        'i.codigo as insumo_codigo', 'i.nombre as insumo_nombre', 
        'pi.cantidad as cantidad_usada'
      ])
      .where('p.empresa_id', '=', empresaId)
      .orderBy('p.nombre')
      .orderBy('i.nombre')
      .execute();

    const ajustes = await db.selectFrom('personalizacion_insumos as pi')
      .innerJoin('items_personalizacion as ip', 'pi.item_personalizacion_id', 'ip.id')
      .innerJoin('insumos as i', 'pi.insumo_id', 'i.id')
      .select([
        'ip.codigo as item_codigo', 'ip.nombre as item_nombre', 
        'i.codigo as insumo_codigo', 'i.nombre as insumo_nombre', 
        'pi.cantidad as cantidad_ajuste'
      ])
      .where('ip.empresa_id', '=', empresaId)
      .orderBy('ip.nombre')
      .orderBy('i.nombre')
      .execute();

    const recetasSheet = XLSX.utils.json_to_sheet(recetas);
    const ajustesSheet = XLSX.utils.json_to_sheet(ajustes);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, recetasSheet, 'RecetasProductos');
    XLSX.utils.book_append_sheet(workbook, ajustesSheet, 'AjustesPersonalizaciones');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="recetas.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Error al exportar recetas:', error);
    res.status(500).json({ error: 'Error al exportar recetas' });
  }
});

router.post('/recetas/import', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const { fileBase64 } = req.body;
    if (!fileBase64) return res.status(400).json({ error: 'fileBase64 es requerido' });

    const buffer = Buffer.from(fileBase64, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const recetasSheet = workbook.Sheets['RecetasProductos'];
    const ajustesSheet = workbook.Sheets['AjustesPersonalizaciones'];

    const recetasRows: any[] = recetasSheet ? XLSX.utils.sheet_to_json(recetasSheet) : [];
    const ajustesRows: any[] = ajustesSheet ? XLSX.utils.sheet_to_json(ajustesSheet) : [];

    const errores: { fila: number; hoja: string; mensaje: string }[] = [];

    // Cargar lookup de códigos → IDs para esta empresa
    const productosDB = await db.selectFrom('productos').select(['id', 'codigo', 'nombre']).where('empresa_id', '=', empresaId).execute();
    const insumosDB = await db.selectFrom('insumos').select(['id', 'codigo', 'nombre']).where('empresa_id', '=', empresaId).execute();
    const itemsDB = await db.selectFrom('items_personalizacion').select(['id', 'codigo', 'nombre']).where('empresa_id', '=', empresaId).execute();

    const prodMap = new Map(productosDB.map(p => [p.codigo, p.id]));
    const prodNameMap = new Map(productosDB.map(p => [p.nombre.toLowerCase(), p.id]));
    const insMap = new Map(insumosDB.map(i => [i.codigo, i.id]));
    const insNameMap = new Map(insumosDB.map(i => [i.nombre.toLowerCase(), i.id]));
    const itemMap = new Map(itemsDB.map(i => [i.codigo, i.id]));
    const itemNameMap = new Map(itemsDB.map(i => [i.nombre.toLowerCase(), i.id]));

    const resolverProductoId = (row: any): string | null => {
      if (row.producto_codigo) return prodMap.get(row.producto_codigo) || null;
      if (row.producto_nombre) return prodNameMap.get(row.producto_nombre.toLowerCase()) || null;
      // Fallback legacy: si viene producto_id directamente
      if (row.producto_id && productosDB.some(p => p.id === row.producto_id)) return row.producto_id;
      return null;
    };

    const resolverInsumoId = (row: any): string | null => {
      if (row.insumo_codigo) return insMap.get(row.insumo_codigo) || null;
      if (row.insumo_nombre) return insNameMap.get(row.insumo_nombre.toLowerCase()) || null;
      if (row.insumo_id && insumosDB.some(i => i.id === row.insumo_id)) return row.insumo_id;
      return null;
    };

    const resolverItemId = (row: any): string | null => {
      if (row.item_codigo) return itemMap.get(row.item_codigo) || null;
      if (row.item_nombre) return itemNameMap.get(row.item_nombre.toLowerCase()) || null;
      if (row.item_personalizacion_id && itemsDB.some(i => i.id === row.item_personalizacion_id)) return row.item_personalizacion_id;
      return null;
    };

    await db.transaction().execute(async (trx) => {
      // Procesar recetas de productos
      const productosConRecetas = new Set<string>();
      for (let idx = 0; idx < recetasRows.length; idx++) {
        const row = recetasRows[idx];
        const prodId = resolverProductoId(row);
        if (!prodId) {
          errores.push({ fila: idx + 2, hoja: 'RecetasProductos', mensaje: `Producto "${row.producto_codigo || row.producto_nombre || '?'}" no encontrado` });
          continue;
        }
        const insId = resolverInsumoId(row);
        if (!insId) {
          errores.push({ fila: idx + 2, hoja: 'RecetasProductos', mensaje: `Insumo "${row.insumo_codigo || row.insumo_nombre || '?'}" no encontrado` });
          continue;
        }
        // Limpiar recetas antiguas de este producto (solo una vez)
        if (!productosConRecetas.has(prodId)) {
          await trx.deleteFrom('producto_insumos')
            .where('producto_id', '=', prodId)
            .where('empresa_id', '=', empresaId)
            .execute();
          productosConRecetas.add(prodId);
        }
        await trx.insertInto('producto_insumos')
          .values({
            empresa_id: empresaId,
            producto_id: prodId,
            insumo_id: insId,
            cantidad: Number(row.cantidad_usada) as any
          })
          .execute();
      }

      // Procesar ajustes de personalizaciones
      const itemsConAjustes = new Set<string>();
      for (let idx = 0; idx < ajustesRows.length; idx++) {
        const row = ajustesRows[idx];
        const itemId = resolverItemId(row);
        if (!itemId) {
          errores.push({ fila: idx + 2, hoja: 'AjustesPersonalizaciones', mensaje: `Item "${row.item_codigo || row.item_nombre || '?'}" no encontrado` });
          continue;
        }
        const insId = resolverInsumoId(row);
        if (!insId) {
          errores.push({ fila: idx + 2, hoja: 'AjustesPersonalizaciones', mensaje: `Insumo "${row.insumo_codigo || row.insumo_nombre || '?'}" no encontrado` });
          continue;
        }
        if (!itemsConAjustes.has(itemId)) {
          await trx.deleteFrom('personalizacion_insumos')
            .where('item_personalizacion_id', '=', itemId)
            .where('empresa_id', '=', empresaId)
            .execute();
          itemsConAjustes.add(itemId);
        }
        await trx.insertInto('personalizacion_insumos')
          .values({
            empresa_id: empresaId,
            item_personalizacion_id: itemId,
            insumo_id: insId,
            cantidad: Number(row.cantidad_ajuste) as any
          })
          .execute();
      }
    });

    res.json({ 
      mensaje: 'Recetas importadas exitosamente',
      errores: errores.length > 0 ? errores : undefined
    });
  } catch (error) {
    console.error('Error al importar recetas:', error);
    res.status(500).json({ error: 'Error al importar recetas' });
  }
});

router.get('/productos/export', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const productos = await db.selectFrom('productos as p')
      .leftJoin('categorias_productos as c', 'p.categoria_id', 'c.id')
      .select([
        'p.codigo',
        'c.nombre as categoria',
        'p.nombre',
        'p.descripcion',
        'p.precio',
        'p.disponible',
        'p.tiene_personalizacion',
        'p.personalizaciones_habilitadas',
        'p.usa_inventario',
        'p.usa_insumos',
        'p.cantidad_inicial',
        'p.cantidad_actual',
        'p.stock'
      ])
      .where('p.empresa_id', '=', empresaId)
      .orderBy('p.codigo', 'asc')
      .execute();

    const productosFormateados = productos.map((producto) => ({
      ...producto,
      personalizaciones_habilitadas: formatearPersonalizacionesParaExcel(producto.personalizaciones_habilitadas)
    }));

    const worksheet = XLSX.utils.json_to_sheet(productosFormateados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="productos.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Error al exportar productos:', error);
    res.status(500).json({ error: 'Error al exportar productos' });
  }
});

router.post('/productos/import', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const { fileBase64 } = req.body;
    if (!fileBase64) return res.status(400).json({ error: 'fileBase64 es requerido' });

    const buffer = Buffer.from(fileBase64, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

    // Obtener categorías existentes para mapear nombres a IDs
    const categorias = await db.selectFrom('categorias_productos')
      .where('empresa_id', '=', empresaId)
      .select(['id', 'nombre'])
      .execute();
    const catMap = new Map(categorias.map(c => [c.nombre.toLowerCase(), c.id]));

    // Detectar códigos duplicados en el Excel
    const codigosEnExcel = rows.map(r => r.codigo?.toString().trim()).filter(Boolean);
    const duplicadosExcel = codigosEnExcel.filter((c, i) => codigosEnExcel.indexOf(c) !== i);

    const errores: { fila: number; mensaje: string }[] = [];
    let creados = 0;
    let actualizados = 0;

    await db.transaction().execute(async (trx) => {
      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        const fila = idx + 2;

        if (!row.nombre || !String(row.nombre).trim()) {
          errores.push({ fila, mensaje: 'Nombre es obligatorio' });
          continue;
        }

        const codigoRaw = row.codigo?.toString().trim() || '';

        if (codigoRaw && duplicadosExcel.includes(codigoRaw)) {
          errores.push({ fila, mensaje: `Código "${codigoRaw}" duplicado en el archivo` });
          continue;
        }

        // Resolver categoría por nombre
        let catId: string | null = null;
        if (row.categoria) {
          catId = catMap.get(row.categoria.toString().toLowerCase()) || null;
          if (!catId) {
            errores.push({ fila, mensaje: `Categoría "${row.categoria}" no encontrada` });
            continue;
          }
        }

        const personalizaciones = parsePersonalizacionesHabilitadas(row.personalizaciones_habilitadas);

        const data: any = {
          nombre: String(row.nombre).trim(),
          descripcion: row.descripcion || null,
          precio: normalizarNumero(row.precio) as any,
          categoria_id: catId,
          disponible: row.disponible === true || row.disponible === 1 || row.disponible === 'true' || row.disponible === 'VERDADERO',
          tiene_personalizacion: row.tiene_personalizacion === true || row.tiene_personalizacion === 1 || row.tiene_personalizacion === 'true' || row.tiene_personalizacion === 'VERDADERO',
          personalizaciones_habilitadas: personalizaciones.length > 0 ? JSON.stringify(personalizaciones) : null,
          usa_inventario: row.usa_inventario === true || row.usa_inventario === 1 || row.usa_inventario === 'true' || row.usa_inventario === 'VERDADERO',
          usa_insumos: row.usa_insumos === true || row.usa_insumos === 1 || row.usa_insumos === 'true' || row.usa_insumos === 'VERDADERO',
          cantidad_inicial: normalizarNumero(row.cantidad_inicial),
          cantidad_actual: normalizarNumero(row.cantidad_actual),
          stock: normalizarNumero(row.stock || row.cantidad_actual),
          updated_at: new Date() as any
        };

        // Buscar existente por (empresa_id + codigo) o (empresa_id + nombre)
        let existente: any = null;
        if (codigoRaw) {
          existente = await trx.selectFrom('productos')
            .select(['id', 'codigo'])
            .where('empresa_id', '=', empresaId)
            .where('codigo', '=', codigoRaw)
            .executeTakeFirst();
        }
        if (!existente) {
          existente = await trx.selectFrom('productos')
            .select(['id', 'codigo'])
            .where('empresa_id', '=', empresaId)
            .where('nombre', '=', String(row.nombre).trim())
            .executeTakeFirst();
        }

        if (existente) {
          await trx.updateTable('productos')
            .set(data)
            .where('id', '=', existente.id)
            .where('empresa_id', '=', empresaId)
            .execute();
          actualizados++;
        } else {
          const nuevoCodigo = codigoRaw || await generarSiguienteCodigo('productos', 'PROD', empresaId, trx);
          await trx.insertInto('productos')
            .values({ ...data, empresa_id: empresaId, codigo: nuevoCodigo })
            .execute();
          creados++;
        }
      }
    });

    res.json({ 
      mensaje: `Importación completada: ${creados} creados, ${actualizados} actualizados`,
      creados,
      actualizados,
      errores: errores.length > 0 ? errores : undefined
    });
  } catch (error) {
    console.error('Error al importar productos:', error);
    res.status(500).json({ error: 'Error al importar productos' });
  }
});

export default router;
