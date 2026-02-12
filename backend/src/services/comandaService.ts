import { db } from '../database/database';
import { ComandaRepository, NewComanda, NewComandaItem } from '../repositories/comandaRepository';
import { InventarioService } from './inventarioService';
import { v4 as uuidv4 } from 'uuid';
import { PrintService } from './printService';

export class ComandaService {
    private comandaRepo: ComandaRepository;
    private inventarioService: InventarioService;
    private printService: PrintService;

    constructor() {
        this.comandaRepo = new ComandaRepository();
        this.inventarioService = new InventarioService();
        this.printService = new PrintService();
    }

    private async buildItemsProcessed(items: any[], empresaId: string, trx: any) {
        const itemsProcessed: NewComandaItem[] = [];
        let subtotal = 0;
        const allPersonalizacionIds = new Set<string>();

        for (const item of items) {
            if (item.personalizacion) {
                Object.values(item.personalizacion).forEach((val: any) => {
                    if (typeof val === 'string') allPersonalizacionIds.add(val);
                    else if (Array.isArray(val)) val.forEach(v => allPersonalizacionIds.add(v));
                });
            }
        }

        const personalizacionInfo = new Map<string, { nombre: string; precio: number }>();
        if (allPersonalizacionIds.size > 0) {
            const rows = await trx.selectFrom('items_personalizacion')
                .select(['id', 'nombre', 'precio_adicional'])
                .where('id', 'in', Array.from(allPersonalizacionIds))
                .execute();
            rows.forEach((p: { id: string; nombre: string; precio_adicional: any }) => {
                personalizacionInfo.set(p.id, { nombre: p.nombre, precio: Number(p.precio_adicional || 0) });
            });
        }

        for (const item of items) {
            const productoId = item.producto_id || (item.producto ? item.producto.id : null);

            if (!productoId) {
                throw new Error('Item de comanda sin producto_id válido');
            }

            const precioUnitario = item.precio_unitario || (item.producto ? item.producto.precio : 0);

            let extraPrice = 0;
            if (item.personalizacion) {
                Object.values(item.personalizacion).forEach((val: any) => {
                    if (typeof val === 'string') extraPrice += personalizacionInfo.get(val)?.precio || 0;
                    else if (Array.isArray(val)) val.forEach(v => extraPrice += personalizacionInfo.get(v)?.precio || 0);
                });
            }

            const totalItem = item.cantidad * (precioUnitario + extraPrice);
            subtotal += totalItem;

            itemsProcessed.push({
                empresa_id: empresaId,
                comanda_id: '',
                producto_id: String(productoId),
                cantidad: item.cantidad,
                precio_unitario: precioUnitario,
                total: totalItem,
                observaciones: item.observaciones || null,
                personalizacion: item.personalizacion || null
            });
        }

        return { itemsProcessed, subtotal, personalizacionInfo };
    }

    private async buildKitchenTicketPayload(params: {
        empresaId: string;
        usuarioId: string | null;
        comandaId: string;
        tipoPedido: string;
        mesaIds: string[];
        cliente: any;
        observaciones: string | null;
        items: any[];
        itemsProcessed: NewComandaItem[];
        personalizacionInfo: Map<string, { nombre: string; precio: number }>;
        trx: any;
        onlyDeltas?: boolean;
        deltasByIndex?: Map<number, number>; // index -> cantidad para imprimir
    }) {
        const {
            empresaId,
            usuarioId,
            comandaId,
            tipoPedido,
            mesaIds,
            cliente,
            observaciones,
            items,
            itemsProcessed,
            personalizacionInfo,
            trx,
            onlyDeltas,
            deltasByIndex
        } = params;

        // Mesas -> números
        const mesas = mesaIds.length
            ? await trx
                  .selectFrom('mesas')
                  .select(['id', 'numero'])
                  .where('empresa_id', '=', empresaId)
                  .where('id', 'in', mesaIds)
                  .execute()
            : [];
        const mesaNumeroById = new Map(mesas.map((m: any) => [m.id, m.numero]));

        // Usuario -> nombre
        let usuarioNombre: string | null = null;
        if (usuarioId) {
            const u = await trx.selectFrom('usuarios')
                .select(['nombre'])
                .where('id', '=', usuarioId)
                .where('empresa_id', '=', empresaId)
                .executeTakeFirst();
            usuarioNombre = u?.nombre || null;
        }

        // Productos -> nombre (por si el frontend no envía producto completo)
        const productIds = Array.from(new Set(itemsProcessed.map(i => i.producto_id)));
        const productos = productIds.length
            ? await trx
                  .selectFrom('productos')
                  .select(['id', 'nombre'])
                  .where('empresa_id', '=', empresaId)
                  .where('id', 'in', productIds)
                  .execute()
            : [];
        const productoNombreById = new Map(productos.map((p: any) => [p.id, p.nombre]));

        const printableItems = itemsProcessed
            .map((processed, index) => {
                const inputItem = items[index];

                const cantidad = onlyDeltas
                    ? (deltasByIndex?.get(index) || 0)
                    : Number(processed.cantidad);

                if (onlyDeltas && cantidad <= 0) return null;

                // Nombre producto
                const productoNombre =
                    inputItem?.producto?.nombre ||
                    inputItem?.producto_nombre ||
                    productoNombreById.get(processed.producto_id) ||
                    'Producto';

                // Personalizaciones: flatten de IDs a nombres
                const personalizaciones: string[] = [];
                const personalizacion = inputItem?.personalizacion;
                if (personalizacion && typeof personalizacion === 'object') {
                    Object.entries(personalizacion).forEach(([key, val]) => {
                        if (key === 'precio_adicional') return;
                        const pushId = (id: any) => {
                            if (typeof id !== 'string') return;
                            const info = personalizacionInfo.get(id);
                            if (info?.nombre) personalizaciones.push(info.nombre);
                        };
                        if (typeof val === 'string') pushId(val);
                        else if (Array.isArray(val)) val.forEach(pushId);
                    });
                }

                return {
                    producto_id: processed.producto_id,
                    nombre: productoNombre,
                    cantidad,
                    observaciones: inputItem?.observaciones || null,
                    personalizaciones
                };
            })
            .filter(Boolean);

        return {
            version: 1,
            comandaId,
            tipo_pedido: tipoPedido,
            mesas: mesaIds.map((id) => ({ id, numero: mesaNumeroById.get(id) || '' })),
            cliente: cliente || null,
            usuario: { id: usuarioId, nombre: usuarioNombre },
            observaciones_generales: observaciones,
            items: printableItems,
            generado_en: new Date().toISOString()
        };
    }

    async crearComanda(
        empresaId: string, 
        usuarioId: string | null, 
        datos: any // Typed broadly to accept frontend payload
    ) {
        
        // Use Transaction for Comanda Creation + Inventory Check/Update
        return await db.transaction().execute(async (trx) => {
            
            // Normalize input data (handle frontend snake_case vs service camelCase)
            const items = datos.items || [];
            const mesaIds = datos.mesaIds || (datos.mesas ? datos.mesas.map((m: any) => m.id) : []);
            const cliente = datos.cliente || datos.datos_cliente || null;
            const tipoPedido = datos.tipoPedido || datos.tipo_pedido || 'mesa';
            const observaciones = datos.observaciones || datos.observaciones_generales || null;

            const { itemsProcessed, subtotal, personalizacionInfo } = await this.buildItemsProcessed(items, empresaId, trx);

            // 2. Decrement Inventory (Ingredients) - This throws if insufficient
            // Pass the transaction 'trx' to ensure atomicity
            const productosExcluidos = await this.inventarioService.processIngredientesConsumption(
                itemsProcessed.map(i => ({ 
                    producto_id: i.producto_id, 
                    cantidad: i.cantidad, 
                    personalizacion: typeof i.personalizacion === 'string' ? JSON.parse(i.personalizacion) : i.personalizacion 
                })), 
                empresaId, 
                trx as any, // Cast to avoid strict type mismatch in this quick draft
                { usuarioId: usuarioId || undefined } // New ID is UUID string
            );

            // 3. Decrement Inventory (Direct Products)
            await this.inventarioService.processProductosConsumption(
                itemsProcessed.map(i => ({ 
                    producto_id: i.producto_id, 
                    cantidad: i.cantidad
                })),
                productosExcluidos,
                empresaId,
                trx as any
            );

            // 4. Create Comanda Record
            const newComanda: NewComanda = {
                empresa_id: empresaId,
                usuario_id: usuarioId,
                cliente_nombre: cliente?.nombre || 'Cliente General',
                datos_cliente: cliente || null,
                tipo_pedido: tipoPedido,
                estado: 'pendiente',
                subtotal: subtotal,
                total: subtotal, // Taxes?
                observaciones: observaciones,
                // fecha_apertura: undefined, // Generated
            };

            const comandaId = await this.comandaRepo.create(
                empresaId, 
                newComanda, 
                itemsProcessed, 
                mesaIds, 
                trx // Pass transaction
            );

            // 5. Encolar impresión remota (best-effort, no bloquea creación de comanda)
            try {
                const printerId = await this.printService.getDefaultPrinterId(empresaId, trx as any);
                if (printerId) {
                    const payload = await this.buildKitchenTicketPayload({
                        empresaId,
                        usuarioId,
                        comandaId,
                        tipoPedido,
                        mesaIds,
                        cliente,
                        observaciones,
                        items,
                        itemsProcessed,
                        personalizacionInfo,
                        trx
                    });

                    await this.printService.createPrintJob(
                        {
                            empresaId,
                            printerId,
                            externalId: comandaId,
                            type: 'kitchen_ticket',
                            payload
                        },
                        trx as any
                    );
                }
            } catch (printErr) {
                console.warn('[PRINT] No se pudo encolar impresión para comanda', printErr);
            }

            return { id: comandaId, total: subtotal };
        });
    }

    async editarComanda(
        comandaId: string,
        empresaId: string,
        usuarioId: string | null,
        datos: any
    ) {
        return await db.transaction().execute(async (trx) => {
            const comanda = await trx.selectFrom('comandas')
                .selectAll()
                .where('id', '=', comandaId)
                .where('empresa_id', '=', empresaId)
                .executeTakeFirst();

            if (!comanda) {
                throw new Error('Comanda no encontrada');
            }

            const items = datos.items || [];
            const observaciones = datos.observaciones || datos.observaciones_generales;

            if (!Array.isArray(items) || items.length === 0) {
                throw new Error('La comanda debe tener items');
            }

            const existingItems = await trx.selectFrom('comanda_items')
                .select([
                    'id',
                    'producto_id',
                    'cantidad',
                    'precio_unitario',
                    'total',
                    'observaciones',
                    'personalizacion'
                ])
                .where('comanda_id', '=', comandaId)
                .where('empresa_id', '=', empresaId)
                .execute();

            const existingById = new Map(existingItems.map(i => [i.id, i]));
            const incomingExistingIds = new Set<string>();

            const { itemsProcessed, subtotal, personalizacionInfo } = await this.buildItemsProcessed(items, empresaId, trx);

            const itemsToConsume: Array<{ producto_id: string; cantidad: number; personalizacion?: any }> = [];
            const updates: Array<{ id: string; data: any }> = [];
            const inserts: any[] = [];

            items.forEach((item: any, index: number) => {
                const processed = itemsProcessed[index];
                const existing = existingById.get(item.id);
                const cantidadAnterior = existing ? Number(existing.cantidad) : 0;
                const delta = Number(processed.cantidad) - cantidadAnterior;

                if (delta > 0) {
                    itemsToConsume.push({
                        producto_id: processed.producto_id,
                        cantidad: delta,
                        personalizacion: item.personalizacion
                    });
                }

                if (existing) {
                    incomingExistingIds.add(item.id);
                    updates.push({
                        id: item.id,
                        data: {
                            producto_id: processed.producto_id,
                            cantidad: processed.cantidad,
                            precio_unitario: processed.precio_unitario,
                            total: processed.total,
                            observaciones: processed.observaciones,
                            personalizacion: processed.personalizacion
                        }
                    });
                } else {
                    inserts.push({
                        id: uuidv4(),
                        ...processed,
                        comanda_id: comandaId
                    });
                }
            });

            const itemsToDelete = existingItems
                .filter(i => !incomingExistingIds.has(i.id))
                .map(i => i.id);

            if (itemsToConsume.length > 0) {
                const productosExcluidos = await this.inventarioService.processIngredientesConsumption(
                    itemsToConsume.map(i => ({
                        producto_id: i.producto_id,
                        cantidad: i.cantidad,
                        personalizacion: typeof i.personalizacion === 'string' ? JSON.parse(i.personalizacion) : i.personalizacion
                    })),
                    empresaId,
                    trx as any,
                    { comandaId, usuarioId: usuarioId || undefined }
                );

                await this.inventarioService.processProductosConsumption(
                    itemsToConsume.map(i => ({
                        producto_id: i.producto_id,
                        cantidad: i.cantidad
                    })),
                    productosExcluidos,
                    empresaId,
                    trx as any
                );
            }

            if (updates.length > 0) {
                for (const update of updates) {
                    await trx.updateTable('comanda_items')
                        .set(update.data)
                        .where('id', '=', update.id)
                        .where('empresa_id', '=', empresaId)
                        .execute();
                }
            }

            if (inserts.length > 0) {
                await trx.insertInto('comanda_items')
                    .values(inserts)
                    .execute();
            }

            if (itemsToDelete.length > 0) {
                await trx.deleteFrom('comanda_items')
                    .where('id', 'in', itemsToDelete)
                    .where('empresa_id', '=', empresaId)
                    .execute();
            }

            const updateData: any = { subtotal, total: subtotal };
            if (observaciones !== undefined) {
                updateData.observaciones = observaciones;
            }

            await trx.updateTable('comandas')
                .set(updateData)
                .where('id', '=', comandaId)
                .where('empresa_id', '=', empresaId)
                .execute();

            // Encolar impresión por edición (si el frontend lo solicitó)
            const imprimirAdicionales = Boolean(datos?.imprimir);
            const imprimirCompleta = Boolean(datos?.imprimirCompleta);

            if (imprimirAdicionales || imprimirCompleta) {
                try {
                    const printerId = await this.printService.getDefaultPrinterId(empresaId, trx as any);
                    if (printerId) {
                        const mesasRows = await trx
                            .selectFrom('comanda_mesas')
                            .select(['mesa_id'])
                            .where('comanda_id', '=', comandaId)
                            .where('empresa_id', '=', empresaId)
                            .execute();
                        const mesaIds = mesasRows.map((m: any) => m.mesa_id);

                        const deltasByIndex = new Map<number, number>();
                        if (!imprimirCompleta) {
                            // calcular deltas por index usando existingById (qty anterior)
                            items.forEach((item: any, index: number) => {
                                const processed = itemsProcessed[index];
                                const existing = existingById.get(item.id);
                                const anterior = existing ? Number(existing.cantidad) : 0;
                                const delta = Number(processed.cantidad) - anterior;
                                if (delta > 0) deltasByIndex.set(index, delta);
                            });
                        }

                        const payload = await this.buildKitchenTicketPayload({
                            empresaId,
                            usuarioId,
                            comandaId,
                            tipoPedido: comanda.tipo_pedido,
                            mesaIds,
                            cliente: comanda.datos_cliente,
                            observaciones: observaciones ?? comanda.observaciones,
                            items,
                            itemsProcessed,
                            personalizacionInfo,
                            trx,
                            onlyDeltas: !imprimirCompleta,
                            deltasByIndex
                        });

                        await this.printService.createPrintJob(
                            {
                                empresaId,
                                printerId,
                                externalId: `${comandaId}:${imprimirCompleta ? 'full' : 'delta'}:${Date.now()}`,
                                type: 'kitchen_ticket',
                                payload
                            },
                            trx as any
                        );
                    }
                } catch (printErr) {
                    console.warn('[PRINT] No se pudo encolar impresión por edición', printErr);
                }
            }

            return { success: true, total: subtotal };
        });
    }

    async getComandasActivas(empresaId: string) {
        return await this.comandaRepo.findAllByEmpresa(empresaId, 'activa');
    }

    async getDetalleComanda(id: string, empresaId: string) {
        return await this.comandaRepo.findById(id, empresaId);
    }
    
    async cerrarComanda(id: string, empresaId: string, pago: { metodo: string, monto: number, cambio: number }) {
        return await this.comandaRepo.cerrarComanda(id, empresaId, pago);
    }

    async cambiarEstado(id: string, empresaId: string, estado: string) {
        // Validate transitions if needed
        return await this.comandaRepo.updateEstado(id, empresaId, estado);
    }

    async getHistorialComandas(empresaId: string, filtros: { desde?: string, hasta?: string, estado?: string, limite?: number }) {
        return await this.comandaRepo.findHistorial(empresaId, filtros);
    }

    async cambiarMesa(id: string, empresaId: string, newMesaIds: string[]) {
        // Validar que las nuevas mesas existan y no estén ocupadas (o manejarlo en repo)
        // Por ahora delegamos al repo que hace el switch
        return await this.comandaRepo.cambiarMesa(id, empresaId, newMesaIds);
    }

    async combinarComandas(targetId: string, sourceId: string, empresaId: string) {
        // Validar que ambas existan y sean de la misma empresa
        return await this.comandaRepo.combinarComandas(targetId, sourceId, empresaId);
    }
}
