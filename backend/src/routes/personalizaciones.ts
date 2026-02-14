import { Router, Request, Response } from 'express';
import { db } from '../database/database';
import { sql } from 'kysely';
import { verificarAutenticacion } from '../middleware/authMiddleware';
import * as XLSX from 'xlsx';

const router = Router();

router.use(verificarAutenticacion);

const normalizarNumero = (val: any): number | null => {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

// Helper para generar siguiente código SKU
const generarSiguienteCodigo = async (
  tabla: 'categorias_personalizacion' | 'items_personalizacion',
  prefijo: string,
  empresaId: string
): Promise<string> => {
  const result = await sql`
    SELECT codigo FROM ${sql.table(tabla)}
    WHERE empresa_id = ${empresaId}
      AND codigo LIKE ${prefijo + '-%'}
    ORDER BY codigo DESC
    LIMIT 1
  `.execute(db);
  let nextNum = 1;
  if ((result.rows as any[]).length > 0) {
    const last = (result.rows as any[])[0].codigo as string;
    const num = parseInt(last.replace(prefijo + '-', ''), 10);
    if (!isNaN(num)) nextNum = num + 1;
  }
  return `${prefijo}-${String(nextNum).padStart(3, '0')}`;
};

// ========== CATEGORÍAS DE PERSONALIZACIÓN ==========

// Obtener todas las categorías de personalización
router.get('/categorias', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const categorias = await db.selectFrom('categorias_personalizacion')
      .selectAll()
      .where('empresa_id', '=', empresaId)
      .where('activo', '=', true)
      .orderBy('orden', 'asc')
      .orderBy('nombre', 'asc')
      .execute();
    
    res.json(categorias);
  } catch (error: any) {
    console.error('Error al obtener categorías de personalización:', error);
    res.status(500).json({ error: 'Error al obtener las categorías' });
  }
});

// Crear nueva categoría de personalización
router.post('/categorias', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const { nombre, descripcion = '', orden = 0, multi_seleccion = false, obligatorio = false } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    const codigoAuto = await generarSiguienteCodigo('categorias_personalizacion', 'CPER', empresaId);

    const nueva = await db.insertInto('categorias_personalizacion')
      .values({
        empresa_id: empresaId,
        codigo: codigoAuto,
        nombre: nombre.trim(),
        multi_seleccion: !!multi_seleccion,
        obligatorio: !!obligatorio,
        orden: Number(orden),
        activo: true
      })
      .returningAll()
      .executeTakeFirstOrThrow();
      
    res.status(201).json(nueva);
  } catch (error: any) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({ error: 'Error al crear la categoría' });
  }
});

// Actualizar categoría de personalización
router.put('/categorias/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    const { nombre, descripcion, orden, activo, multi_seleccion, obligatorio } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    const actualizada = await db.updateTable('categorias_personalizacion')
      .set({
        nombre: nombre.trim(),
        descripcion: descripcion,
        orden: orden !== undefined ? Number(orden) : undefined,
        activo: activo !== undefined ? !!activo : undefined,
        multi_seleccion: multi_seleccion !== undefined ? !!multi_seleccion : undefined,
        obligatorio: obligatorio !== undefined ? !!obligatorio : undefined
      })
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .returningAll()
      .executeTakeFirst();
      
    if (!actualizada) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    
    res.json(actualizada);
  } catch (error: any) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({ error: 'Error al actualizar la categoría' });
  }
});

// Eliminar categoría de personalización
router.delete('/categorias/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    
    const result = await db.deleteFrom('categorias_personalizacion')
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();
    
    if (Number(result.numDeletedRows) === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    
    res.json({ mensaje: 'Categoría eliminada exitosamente' });
  } catch (error: any) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ 
      error: 'Error al eliminar la categoría',
      detalles: error.message 
    });
  }
});

// ===== ENDPOINTS GENÉRICOS PARA ITEMS DE CUALQUIER CATEGORÍA =====

// Obtener todos los items de una categoría
router.get('/categorias/:categoriaId/items', async (req: Request, res: Response) => {
  try {
    const { categoriaId } = req.params;
    const { empresaId } = req.context;
    
    const rows = await db.selectFrom('items_personalizacion')
      .selectAll()
      .where('categoria_id', '=', categoriaId)
      .where('empresa_id', '=', empresaId)
      .where('activo', '=', true)
      .orderBy('nombre', 'asc')
      .execute();
    
    // Mapear items y calcular disponibilidad real
    const items = rows.map(item => {
      const usaInventario = !!item.usa_inventario;
      let disponible = !!item.disponible;
      
      // Si usa inventario y cantidad_actual es 0, automáticamente no disponible
      if (usaInventario && item.cantidad_actual !== null && Number(item.cantidad_actual) <= 0) {
        disponible = false;
      }
      
      return {
        ...item,
        usa_inventario: usaInventario,
        disponible: disponible ? 1 : 0
      };
    });
    
    res.json(items);
  } catch (error: any) {
    console.error('Error al obtener items de personalización:', error);
    res.status(500).json({ error: 'Error al obtener items' });
  }
});

// Crear un nuevo item para una categoría
router.post('/categorias/:categoriaId/items', async (req: Request, res: Response) => {
  try {
    const { categoriaId } = req.params;
    const { empresaId } = req.context;
    const { nombre, descripcion, precio_adicional, usa_inventario, usa_insumos, cantidad_inicial } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    
    // Validar inventario si está habilitado
    const usaInv = !!usa_inventario;
    if (usaInv && (cantidad_inicial === undefined || cantidad_inicial === null || Number(cantidad_inicial) < 0)) {
      return res.status(400).json({ error: 'Debe especificar una cantidad inicial válida cuando usa inventario' });
    }
    
    const cantidadIni = usaInv ? Number(cantidad_inicial) : null;
    const cantidadAct = usaInv ? Number(cantidad_inicial) : null;
    
    const codigoAutoItem = await generarSiguienteCodigo('items_personalizacion', 'PER', empresaId);

    const nuevo = await db.insertInto('items_personalizacion')
      .values({
        empresa_id: empresaId,
        codigo: codigoAutoItem,
        categoria_id: categoriaId,
        nombre: nombre.trim(),
        descripcion: descripcion || null,
        precio_adicional: Number(precio_adicional) || 0,
        usa_inventario: usaInv,
        usa_insumos: !!usa_insumos,
        cantidad_inicial: cantidadIni as any,
        cantidad_actual: cantidadAct as any,
        activo: true,
        disponible: true
      })
      .returningAll()
      .executeTakeFirstOrThrow();
      
    res.status(201).json(nuevo);
  } catch (error: any) {
    console.error('Error al crear item de personalización:', error);
    res.status(500).json({ error: 'Error al crear el item' });
  }
});

// Actualizar un item
router.put('/categorias/:categoriaId/items/:itemId', async (req: Request, res: Response) => {
  try {
    const { categoriaId, itemId } = req.params;
    const { empresaId } = req.context;
    const { nombre, descripcion, precio_adicional, usa_inventario, usa_insumos, cantidad_inicial, cantidad_actual, activo, disponible } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    
    // Validar inventario si está habilitado
    const usaInv = !!usa_inventario;
    
    const actualizada = await db.updateTable('items_personalizacion')
      .set({
        nombre: nombre.trim(),
        descripcion: descripcion || null,
        precio_adicional: precio_adicional !== undefined ? Number(precio_adicional) : undefined,
        usa_inventario: usaInv,
        usa_insumos: usa_insumos !== undefined ? !!usa_insumos : undefined,
        cantidad_inicial: cantidad_inicial !== undefined ? Number(cantidad_inicial) : undefined,
        cantidad_actual: cantidad_actual !== undefined ? Number(cantidad_actual) : undefined,
        activo: activo !== undefined ? !!activo : undefined,
        disponible: disponible !== undefined ? !!disponible : undefined,
        updated_at: new Date() as any
      })
      .where('id', '=', itemId)
      .where('categoria_id', '=', categoriaId)
      .where('empresa_id', '=', empresaId)
      .returningAll()
      .executeTakeFirst();
      
    if (!actualizada) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    
    res.json(actualizada);
  } catch (error: any) {
    console.error('Error al actualizar item:', error);
    res.status(500).json({ error: 'Error al actualizar el item' });
  }
});

// Eliminar un item
router.delete('/categorias/:categoriaId/items/:itemId', async (req: Request, res: Response) => {
  try {
    const { categoriaId, itemId } = req.params;
    const { empresaId } = req.context;
    
    const result = await db.deleteFrom('items_personalizacion')
      .where('id', '=', itemId)
      .where('categoria_id', '=', categoriaId)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();
      
    if (Number(result.numDeletedRows) === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    
    res.json({ mensaje: 'Item eliminado exitosamente' });
  } catch (error: any) {
    console.error('Error al eliminar item:', error);
    res.status(500).json({ error: 'Error al eliminar el item' });
  }
});

// Decrementar inventario de un item (usado al crear/editar comandas)
router.patch('/categorias/:categoriaId/items/:itemId/decrementar', async (req: Request, res: Response) => {
  try {
    const { categoriaId, itemId } = req.params;
    const { empresaId } = req.context;
    const { cantidad } = req.body;
    
    if (!cantidad || Number(cantidad) <= 0) {
      return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
    }
    
    const item = await db.selectFrom('items_personalizacion')
      .selectAll()
      .where('id', '=', itemId)
      .where('categoria_id', '=', categoriaId)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();
      
    if (!item) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    
    if (!item.usa_inventario) {
      return res.json({ mensaje: 'Item no usa inventario', item });
    }
    
    const cantActual = Number(item.cantidad_actual);
    if (item.cantidad_actual === null || cantActual < Number(cantidad)) {
      return res.status(400).json({ 
        error: 'Inventario insuficiente',
        disponible: cantActual || 0,
        solicitado: cantidad
      });
    }
    
    const nuevaCantidad = cantActual - Number(cantidad);
    
    const actualizada = await db.updateTable('items_personalizacion')
      .set({
        cantidad_actual: nuevaCantidad,
        disponible: nuevaCantidad > 0 ? true : false,
        updated_at: new Date() as any
      })
      .where('id', '=', itemId)
      .where('empresa_id', '=', empresaId)
      .returningAll()
      .executeTakeFirst();
      
    res.json({ 
      mensaje: `Inventario decrementado. Cantidad actual: ${nuevaCantidad}`,
      item: actualizada,
      cantidad_anterior: cantActual,
      cantidad_decrementada: cantidad,
      cantidad_nueva: nuevaCantidad
    });
  } catch (error: any) {
    console.error('Error al decrementar inventario:', error);
    res.status(500).json({ error: 'Error al actualizar inventario' });
  }
});

// Cambiar disponibilidad de un item
router.patch('/categorias/:categoriaId/items/:itemId/disponibilidad', async (req: Request, res: Response) => {
  try {
    const { categoriaId, itemId } = req.params;
    const { empresaId } = req.context;
    const { disponible } = req.body;
    
    if (disponible === undefined) {
      return res.status(400).json({ error: 'El campo disponible es requerido' });
    }
    
    const actualizada = await db.updateTable('items_personalizacion')
      .set({
        disponible: !!disponible,
        updated_at: new Date() as any
      })
      .where('id', '=', itemId)
      .where('categoria_id', '=', categoriaId)
      .where('empresa_id', '=', empresaId)
      .returningAll()
      .executeTakeFirst();
      
    if (!actualizada) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    
    res.json({ 
      mensaje: `Item ${disponible ? 'disponible' : 'no disponible'}`, 
      item: actualizada 
    });
  } catch (error: any) {
    console.error('Error al actualizar disponibilidad:', error);
    res.status(500).json({ error: 'Error al actualizar disponibilidad' });
  }
});

// ========== IMPORTAR / EXPORTAR PERSONALIZACIONES ==========

router.get('/export', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const categorias = await db.selectFrom('categorias_personalizacion')
      .select(['codigo', 'nombre', 'descripcion', 'multi_seleccion', 'obligatorio', 'activo', 'orden'])
      .where('empresa_id', '=', empresaId)
      .orderBy('orden', 'asc')
      .orderBy('nombre', 'asc')
      .execute();
      
    const items = await db.selectFrom('items_personalizacion as ip')
      .innerJoin('categorias_personalizacion as cp', 'ip.categoria_id', 'cp.id')
      .select([
        'ip.codigo',
        'cp.codigo as categoria_codigo',
        'ip.nombre',
        'ip.descripcion',
        'ip.precio_adicional',
        'ip.disponible',
        'ip.usa_inventario',
        'ip.usa_insumos',
        'ip.cantidad_inicial',
        'ip.cantidad_actual',
        'ip.cantidad_minima'
      ])
      .where('ip.empresa_id', '=', empresaId)
      .orderBy('cp.nombre', 'asc')
      .orderBy('ip.nombre', 'asc')
      .execute();

    const wb = XLSX.utils.book_new();
    
    const wsCategorias = XLSX.utils.json_to_sheet(categorias);
    XLSX.utils.book_append_sheet(wb, wsCategorias, 'Categorias');
    
    const wsItems = XLSX.utils.json_to_sheet(items);
    XLSX.utils.book_append_sheet(wb, wsItems, 'Items');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=personalizaciones.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error al exportar personalizaciones:', error);
    res.status(500).json({ error: 'Error al exportar personalizaciones' });
  }
});

router.post('/import', async (req: Request, res: Response) => {
  const { fileBase64 } = req.body;
  const { empresaId } = req.context;
  
  if (!fileBase64) {
    return res.status(400).json({ error: 'Archivo no proporcionado' });
  }

  try {
    const buffer = Buffer.from(fileBase64, 'base64');
    const wb = XLSX.read(buffer, { type: 'buffer' });
    
    const categoriasSheet = wb.Sheets['Categorias'];
    const itemsSheet = wb.Sheets['Items'];

    if (!categoriasSheet) {
      return res.status(400).json({ error: 'Falta la hoja de "Categorias" en el archivo' });
    }

    const categoriasRows: any[] = XLSX.utils.sheet_to_json(categoriasSheet);
    const itemsRows: any[] = itemsSheet ? XLSX.utils.sheet_to_json(itemsSheet) : [];

    const errores: { fila: number; hoja: string; mensaje: string }[] = [];
    let catCreadas = 0;
    let catActualizadas = 0;
    let itemsCreados = 0;
    let itemsActualizados = 0;

    const normalizarTexto = (valor: any): string => String(valor ?? '').trim();
    const normalizarClave = (valor: any): string => normalizarTexto(valor).toLowerCase();
    const parseBooleano = (valor: any, valorPorDefecto: boolean): boolean => {
      if (valor === undefined || valor === null || valor === '') return valorPorDefecto;
      if (typeof valor === 'boolean') return valor;
      const normalizado = String(valor).trim().toLowerCase();
      if (['true', '1', 'si', 'sí', 'yes', 'x'].includes(normalizado)) return true;
      if (['false', '0', 'no'].includes(normalizado)) return false;
      return valorPorDefecto;
    };
    const parseNumeroONull = (valor: any): number | null => {
      if (valor === undefined || valor === null || valor === '') return null;
      const numero = Number(valor);
      return Number.isNaN(numero) ? null : numero;
    };

    // Helper para generar siguiente código de categoría o item
    const generarSiguienteCodigoLocal = async (
      tabla: 'categorias_personalizacion' | 'items_personalizacion',
      prefijo: string,
      trx: any
    ): Promise<string> => {
      const result = await sql`
        SELECT codigo FROM ${sql.table(tabla)}
        WHERE empresa_id = ${empresaId}
          AND codigo LIKE ${prefijo + '-%'}
        ORDER BY codigo DESC
        LIMIT 1
      `.execute(trx);
      let nextNum = 1;
      if ((result.rows as any[]).length > 0) {
        const last = (result.rows as any[])[0].codigo as string;
        const num = parseInt(last.replace(prefijo + '-', ''), 10);
        if (!isNaN(num)) nextNum = num + 1;
      }
      return `${prefijo}-${String(nextNum).padStart(3, '0')}`;
    };

    await db.transaction().execute(async (trx) => {
      // Mapa de codigo de categoría → id (se va construyendo)
      const catCodigoMap = new Map<string, string>();
      const catNombreMap = new Map<string, string>();

      // Cargar existentes
      const existentes = await trx.selectFrom('categorias_personalizacion')
        .select(['id', 'codigo', 'nombre'])
        .where('empresa_id', '=', empresaId)
        .execute();
      for (const c of existentes) {
        catCodigoMap.set(c.codigo, c.id);
        catNombreMap.set(normalizarClave(c.nombre), c.id);
      }

      for (let idx = 0; idx < categoriasRows.length; idx++) {
        const catRow = categoriasRows[idx];
        const fila = idx + 2;

        const nombreCategoria = normalizarTexto(catRow.nombre);
        if (!nombreCategoria) {
          errores.push({ fila, hoja: 'Categorias', mensaje: 'Nombre es obligatorio' });
          continue;
        }

        const codigoRaw = normalizarTexto(catRow.codigo);
        let categoryId: string | undefined;

        // Buscar existente por codigo o nombre
        if (codigoRaw) {
          categoryId = catCodigoMap.get(codigoRaw);
        }
        if (!categoryId) {
          categoryId = catNombreMap.get(normalizarClave(nombreCategoria));
        }

        if (categoryId) {
          await trx.updateTable('categorias_personalizacion')
            .set({
              nombre: nombreCategoria,
              descripcion: normalizarTexto(catRow.descripcion),
              orden: catRow.orden || 0,
              activo: parseBooleano(catRow.activo, true),
              multi_seleccion: parseBooleano(catRow.multi_seleccion, false),
              obligatorio: parseBooleano(catRow.obligatorio, false)
            })
            .where('id', '=', categoryId)
            .execute();

          if (codigoRaw) {
            catCodigoMap.set(codigoRaw, categoryId);
          }
          catNombreMap.set(normalizarClave(nombreCategoria), categoryId);
          catActualizadas++;
        } else {
          const nuevoCodigo = codigoRaw || await generarSiguienteCodigoLocal('categorias_personalizacion', 'CPER', trx);
          const newCat = await trx.insertInto('categorias_personalizacion')
            .values({
              empresa_id: empresaId,
              codigo: nuevoCodigo,
              nombre: nombreCategoria,
              descripcion: normalizarTexto(catRow.descripcion),
              orden: catRow.orden || 0,
              activo: parseBooleano(catRow.activo, true),
              multi_seleccion: parseBooleano(catRow.multi_seleccion, false),
              obligatorio: parseBooleano(catRow.obligatorio, false)
            })
            .returning(['id', 'codigo'])
            .executeTakeFirstOrThrow();
          categoryId = newCat.id;
          catCodigoMap.set(newCat.codigo, newCat.id);
          catNombreMap.set(normalizarClave(nombreCategoria), newCat.id);
          catCreadas++;
        }
      }

      for (let idx = 0; idx < itemsRows.length; idx++) {
        const itemRow = itemsRows[idx];
        const fila = idx + 2;

        const nombreItem = normalizarTexto(itemRow.nombre);
        if (!nombreItem) {
          errores.push({ fila, hoja: 'Items', mensaje: 'Nombre es obligatorio' });
          continue;
        }

        const categoriaCodigo = normalizarTexto(itemRow.categoria_codigo);
        const categoriaNombre = normalizarTexto(itemRow.categoria_nombre);

        let categoryId: string | undefined;
        if (categoriaCodigo) {
          categoryId = catCodigoMap.get(categoriaCodigo);
        }
        if (!categoryId && categoriaNombre) {
          categoryId = catNombreMap.get(normalizarClave(categoriaNombre));
        }

        if (!categoryId) {
          errores.push({
            fila,
            hoja: 'Items',
            mensaje: 'No se encontró la categoría asociada. Usa categoria_codigo válido.'
          });
          continue;
        }

        const itemCodigoRaw = normalizarTexto(itemRow.codigo);

        let existingItem: any = null;
        if (itemCodigoRaw) {
          existingItem = await trx.selectFrom('items_personalizacion')
            .select('id')
            .where('empresa_id', '=', empresaId)
            .where('codigo', '=', itemCodigoRaw)
            .executeTakeFirst();
        }
        if (!existingItem) {
          existingItem = await trx.selectFrom('items_personalizacion')
            .select('id')
            .where('empresa_id', '=', empresaId)
            .where('categoria_id', '=', categoryId)
            .where('nombre', '=', nombreItem)
            .executeTakeFirst();
        }

        const payload = {
          nombre: nombreItem,
          categoria_id: categoryId,
          descripcion: normalizarTexto(itemRow.descripcion),
          precio_adicional: parseNumeroONull(itemRow.precio_adicional) ?? 0,
          disponible: parseBooleano(itemRow.disponible, true),
          usa_inventario: parseBooleano(itemRow.usa_inventario, false),
          usa_insumos: parseBooleano(itemRow.usa_insumos, false),
          cantidad_inicial: parseNumeroONull(itemRow.cantidad_inicial),
          cantidad_actual: parseNumeroONull(itemRow.cantidad_actual),
          cantidad_minima: parseNumeroONull(itemRow.cantidad_minima)
        };

        if (existingItem) {
          await trx.updateTable('items_personalizacion')
            .set({
              ...payload,
              updated_at: new Date() as any
            })
            .where('id', '=', existingItem.id)
            .execute();
          itemsActualizados++;
        } else {
          const nuevoItemCodigo = itemCodigoRaw || await generarSiguienteCodigoLocal('items_personalizacion', 'PER', trx);
          await trx.insertInto('items_personalizacion')
            .values({
              empresa_id: empresaId,
              codigo: nuevoItemCodigo,
              activo: true,
              ...payload
            })
            .execute();
          itemsCreados++;
        }
      }
    });

    res.json({ 
      mensaje: `Personalizaciones importadas: ${catCreadas + catActualizadas} categorías, ${itemsCreados + itemsActualizados} items`,
      categorias: { creadas: catCreadas, actualizadas: catActualizadas },
      items: { creados: itemsCreados, actualizados: itemsActualizados },
      errores: errores.length > 0 ? errores : undefined
    });
  } catch (error) {
    console.error('Error al importar personalizaciones:', error);
    res.status(500).json({ error: 'Error al importar personalizaciones' });
  }
});

export default router;
