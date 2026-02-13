import { db } from '../database/database';
import { Insertable, Updateable } from 'kysely';
import { ConfiguracionNominaTable, EmpleadosTable, NominasTable, NominaDetallesTable } from '../database/types';

export class NominaRepository {
    // Configuración
    async getConfiguracionVigente(empresaId: string) {
        return await db
            .selectFrom('configuracion_nomina')
            .selectAll()
            .where('empresa_id', '=', empresaId)
            .where('vigente', '=', true)
            .orderBy('created_at', 'desc')
            .executeTakeFirst();
    }

    async desactivarConfiguraciones(empresaId: string) {
        return await db
            .updateTable('configuracion_nomina')
            .set({ vigente: false })
            .where('empresa_id', '=', empresaId)
            .where('vigente', '=', true)
            .execute();
    }

    async guardarConfiguracion(config: Insertable<ConfiguracionNominaTable>) {
        return await db
            .insertInto('configuracion_nomina')
            .values(config)
            .returningAll()
            .executeTakeFirstOrThrow();
    }

    // Empleados
    async listarEmpleados(empresaId: string, soloActivos: boolean = true) {
        let query = db.selectFrom('empleados').selectAll().where('empresa_id', '=', empresaId);
        if (soloActivos) query = query.where('estado', '=', 'ACTIVO');
        return await query.execute();
    }

    async obtenerEmpleado(id: string, empresaId: string) {
        return await db
            .selectFrom('empleados')
            .selectAll()
            .where('id', '=', id)
            .where('empresa_id', '=', empresaId)
            .executeTakeFirst();
    }

    async crearEmpleado(empleado: Insertable<EmpleadosTable>) {
        return await db.insertInto('empleados').values(empleado).returningAll().executeTakeFirstOrThrow();
    }

    async actualizarEmpleado(id: string, empresaId: string, empleado: Updateable<EmpleadosTable>) {
        return await db
            .updateTable('empleados')
            .set(empleado)
            .where('id', '=', id)
            .where('empresa_id', '=', empresaId)
            .returningAll()
            .executeTakeFirst();
    }

    // Nominas
    async listarNominas(empresaId: string, mes: number, anio: number) {
        return await db
            .selectFrom('nominas')
            .selectAll()
            .where('empresa_id', '=', empresaId)
            .where('mes', '=', mes)
            .where('anio', '=', anio)
            .execute();
    }

    async crearNomina(nomina: Insertable<NominasTable>) {
        return await db.insertInto('nominas').values(nomina).returningAll().executeTakeFirstOrThrow();
    }

    async agregarDetalle(detalle: Insertable<NominaDetallesTable>) {
        return await db.insertInto('nomina_detalles').values(detalle).returningAll().executeTakeFirstOrThrow();
    }

    async obtenerNominaCompleta(id: string, empresaId: string) {
        const nomina = await db
            .selectFrom('nominas')
            .selectAll()
            .where('id', '=', id)
            .where('empresa_id', '=', empresaId)
            .executeTakeFirst();

        if (!nomina) return null;

        const detalles = await db
            .selectFrom('nomina_detalles')
            .selectAll()
            .where('nomina_id', '=', id)
            .where('empresa_id', '=', empresaId)
            .execute();

        return { ...nomina, detalles };
    }

    // Buscar nómina existente por empleado y periodo
    async buscarNominaExistente(empresaId: string, empleadoId: string, mes: number, anio: number) {
        return await db
            .selectFrom('nominas')
            .selectAll()
            .where('empresa_id', '=', empresaId)
            .where('empleado_id', '=', empleadoId)
            .where('mes', '=', mes)
            .where('anio', '=', anio)
            .executeTakeFirst();
    }

    async listarNominasPeriodoEmpleado(empresaId: string, empleadoId: string, mes: number, anio: number) {
        return await db
            .selectFrom('nominas')
            .selectAll()
            .where('empresa_id', '=', empresaId)
            .where('empleado_id', '=', empleadoId)
            .where('mes', '=', mes)
            .where('anio', '=', anio)
            .orderBy('fecha', 'asc')
            .orderBy('id', 'asc')
            .execute();
    }

    async cerrarNominasAbiertasPeriodo(empresaId: string, empleadoId: string, mes: number, anio: number) {
        return await db
            .updateTable('nominas')
            .set({ estado: 'CERRADA' })
            .where('empresa_id', '=', empresaId)
            .where('empleado_id', '=', empleadoId)
            .where('mes', '=', mes)
            .where('anio', '=', anio)
            .where('estado', '=', 'ABIERTA')
            .execute();
    }

    // Actualizar nómina
    async actualizarNomina(id: string, empresaId: string, data: { monto_total: number; estado: string }) {
        return await db
            .updateTable('nominas')
            .set(data)
            .where('id', '=', id)
            .where('empresa_id', '=', empresaId)
            .returningAll()
            .executeTakeFirstOrThrow();
    }

    // Eliminar detalles de nómina (para recrearlos)
    async eliminarDetallesNomina(nominaId: string, empresaId: string) {
        return await db
            .deleteFrom('nomina_detalles')
            .where('nomina_id', '=', nominaId)
            .where('empresa_id', '=', empresaId)
            .execute();
    }

    // Obtener detalles de una nómina
    async obtenerDetallesNomina(nominaId: string, empresaId: string) {
        return await db
            .selectFrom('nomina_detalles')
            .selectAll()
            .where('nomina_id', '=', nominaId)
            .where('empresa_id', '=', empresaId)
            .execute();
    }

    // Buscar nóminas de un empleado
    async buscarNominasEmpleado(empresaId: string, empleadoId: string, mes?: number, anio?: number) {
        let query = db
            .selectFrom('nominas')
            .selectAll()
            .where('empresa_id', '=', empresaId)
            .where('empleado_id', '=', empleadoId);
        
        if (mes !== undefined) {
            query = query.where('mes', '=', mes);
        }
        if (anio !== undefined) {
            query = query.where('anio', '=', anio);
        }
        
        return await query
            .orderBy('anio', 'desc')
            .orderBy('mes', 'desc')
            .orderBy('fecha', 'desc')
            .orderBy('id', 'desc')
            .execute();
    }

    // Pagos de nómina
    async obtenerPagosNomina(nominaId: string, empresaId: string) {
        try {
            return await db
                .selectFrom('nomina_pagos' as any)
                .selectAll()
                .where('nomina_id', '=', nominaId)
                .where('empresa_id', '=', empresaId)
                .execute();
        } catch {
            // Si la tabla no existe, retornar array vacío
            return [];
        }
    }

    async registrarPago(pago: { empresa_id: string; nomina_id: string; valor: number; fecha: Date; tipo: string; observaciones: string | null }) {
        try {
            return await db
                .insertInto('nomina_pagos' as any)
                .values(pago)
                .returningAll()
                .executeTakeFirstOrThrow();
        } catch (error: any) {
            // Si la tabla no existe, crear una respuesta simulada
            console.warn('Tabla nomina_pagos no existe:', error.message);
            return { ...pago, id: Date.now().toString() };
        }
    }

    // Eliminar historial de nómina por periodo
    async eliminarHistorialPorPeriodo(empresaId: string, periodoMes: string, periodoAnio: number) {
        try {
            // Convertir mes a número (ENERO=1, FEBRERO=2, etc.)
            const meses: { [key: string]: number } = {
                'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4,
                'MAYO': 5, 'JUNIO': 6, 'JULIO': 7, 'AGOSTO': 8,
                'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12
            };
            const mesNumero = meses[periodoMes] || 1;

            // 1. Obtener IDs de nóminas del periodo
            const nominasDelPeriodo = await db
                .selectFrom('nominas' as any)
                .select('id')
                .where('empresa_id', '=', empresaId)
                .where('mes', '=', mesNumero)
                .where('anio', '=', periodoAnio)
                .execute();

            const nominaIds = nominasDelPeriodo.map((n: any) => n.id);

            let resultPagos: any = { numDeletedRows: 0 };
            let resultDetalles: any = { numDeletedRows: 0 };
            
            // 2. Eliminar pagos de nómina asociados a esas nóminas (si existen)
            if (nominaIds.length > 0) {
                try {
                    resultPagos = await db
                        .deleteFrom('nomina_pagos' as any)
                        .where('empresa_id', '=', empresaId)
                        .where('nomina_id', 'in', nominaIds)
                        .executeTakeFirst();
                } catch (err) {
                    console.warn('Tabla nomina_pagos no existe o está vacía');
                }

                // 3. Eliminar detalles de nómina
                try {
                    resultDetalles = await db
                        .deleteFrom('nomina_detalles' as any)
                        .where('nomina_id', 'in', nominaIds)
                        .executeTakeFirst();
                } catch (err) {
                    console.warn('Error eliminando nomina_detalles:', err);
                }
            }

            // 4. Eliminar nóminas
            const resultNominas = await db
                .deleteFrom('nominas' as any)
                .where('empresa_id', '=', empresaId)
                .where('mes', '=', mesNumero)
                .where('anio', '=', periodoAnio)
                .executeTakeFirst();

            const totalDeleted = 
                Number(resultPagos?.numDeletedRows || 0) +
                Number(resultDetalles?.numDeletedRows || 0) +
                Number(resultNominas?.numDeletedRows || 0);

            return { deletedCount: totalDeleted };
        } catch (error: any) {
            console.error('Error al eliminar historial por periodo:', error);
            throw new Error(`Error al eliminar historial: ${error.message}`);
        }
    }

    // Eliminar historial de nómina por fechas
    async eliminarHistorialPorFechas(empresaId: string, fechaInicio: string, fechaFin: string) {
        try {
            const fechaInicioDate = new Date(fechaInicio);
            const fechaFinDate = new Date(fechaFin);

            // 1. Obtener IDs de nóminas en el rango de fechas
            const nominasDelRango = await db
                .selectFrom('nominas' as any)
                .select('id')
                .where('empresa_id', '=', empresaId)
                .where('fecha', '>=', fechaInicioDate as any)
                .where('fecha', '<=', fechaFinDate as any)
                .execute();

            const nominaIds = nominasDelRango.map((n: any) => n.id);

            let resultPagos: any = { numDeletedRows: 0 };
            let resultDetalles: any = { numDeletedRows: 0 };

            // 2. Eliminar pagos de nómina (si existen)
            if (nominaIds.length > 0) {
                try {
                    resultPagos = await db
                        .deleteFrom('nomina_pagos' as any)
                        .where('empresa_id', '=', empresaId)
                        .where('fecha', '>=', fechaInicioDate as any)
                        .where('fecha', '<=', fechaFinDate as any)
                        .executeTakeFirst();
                } catch (err) {
                    console.warn('Tabla nomina_pagos no existe o está vacía');
                }

                // 3. Eliminar detalles de nómina
                try {
                    resultDetalles = await db
                        .deleteFrom('nomina_detalles' as any)
                        .where('nomina_id', 'in', nominaIds)
                        .executeTakeFirst();
                } catch (err) {
                    console.warn('Error eliminando nomina_detalles:', err);
                }
            }

            // 4. Eliminar nóminas
            const resultNominas = await db
                .deleteFrom('nominas' as any)
                .where('empresa_id', '=', empresaId)
                .where('fecha', '>=', fechaInicioDate as any)
                .where('fecha', '<=', fechaFinDate as any)
                .executeTakeFirst();

            const totalDeleted = 
                Number(resultPagos?.numDeletedRows || 0) +
                Number(resultDetalles?.numDeletedRows || 0) +
                Number(resultNominas?.numDeletedRows || 0);

            return { deletedCount: totalDeleted };
        } catch (error: any) {
            console.error('Error al eliminar historial por fechas:', error);
            throw new Error(`Error al eliminar historial: ${error.message}`);
        }
    }
}
