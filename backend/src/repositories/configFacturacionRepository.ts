import { db } from '../database/database';
import { ConfigFacturacionTable } from '../database/types';
import { Insertable, Updateable } from 'kysely';
import { sql } from 'kysely';

export class ConfigFacturacionRepository {
    private availableColumnsCache: Set<string> | null = null;

    private async getAvailableColumns(): Promise<Set<string>> {
        if (this.availableColumnsCache) return this.availableColumnsCache;

        const columnsResult = await sql<{ column_name: string }>`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'config_facturacion'
        `.execute(db);

        this.availableColumnsCache = new Set(columnsResult.rows.map((row: any) => String(row.column_name)));
        return this.availableColumnsCache;
    }

    private normalizeForRead(row: any) {
        if (!row) return row;

        return {
            ...row,
            nombre_empresa: row.nombre_empresa ?? row.razon_social ?? '',
            nit: row.nit ?? row.rut ?? '',
            correo_electronico: row.correo_electronico ?? row.email ?? '',
            telefonos:
                Array.isArray(row.telefonos) && row.telefonos.length > 0
                    ? row.telefonos
                    : row.telefono
                    ? [row.telefono]
                    : [],
            responsable_iva: Boolean(row.responsable_iva),
            tributos: Array.isArray(row.tributos) ? row.tributos : []
        };
    }

    private adaptForLegacySchema(data: any): any {
        const adapted = { ...data };

        if (adapted.nombre_empresa && !adapted.razon_social) {
            adapted.razon_social = adapted.nombre_empresa;
        }
        if (adapted.nit && !adapted.rut) {
            adapted.rut = adapted.nit;
        }
        if (adapted.correo_electronico && !adapted.email) {
            adapted.email = adapted.correo_electronico;
        }
        if (Array.isArray(adapted.telefonos) && adapted.telefonos[0] && !adapted.telefono) {
            adapted.telefono = adapted.telefonos[0];
        }

        return adapted;
    }

    private filterByExistingColumns(data: any, columns: Set<string>): any {
        const filteredEntries = Object.entries(data).filter(([key, value]) => {
            if (!columns.has(key)) return false;
            return value !== undefined;
        });
        return Object.fromEntries(filteredEntries);
    }

    async findByEmpresaId(empresaId: string) {
        const row = await db
            .selectFrom('config_facturacion')
            .selectAll()
            .where('empresa_id', '=', empresaId)
            .orderBy('id', 'desc')
            .executeTakeFirst();

        return this.normalizeForRead(row);
    }

    async upsert(empresaId: string, data: Insertable<ConfigFacturacionTable> | Updateable<ConfigFacturacionTable>) {
        const existing = await this.findByEmpresaId(empresaId);
        const availableColumns = await this.getAvailableColumns();

        // Preparar datos para JSONB
        let preparedData: any = this.adaptForLegacySchema({ ...data });
        
        // Asegurar que telefonos y tributos sean arrays válidos
        if (preparedData.telefonos && Array.isArray(preparedData.telefonos)) {
            preparedData.telefonos = JSON.stringify(preparedData.telefonos);
        }
        if (preparedData.tributos && Array.isArray(preparedData.tributos)) {
            preparedData.tributos = JSON.stringify(preparedData.tributos);
        }

        preparedData = this.filterByExistingColumns(preparedData, availableColumns);

        if (Object.keys(preparedData).length === 0) {
            throw new Error('No hay campos válidos para actualizar en config_facturacion');
        }

        if (existing) {
            const updatePayload = this.filterByExistingColumns({ ...preparedData, updated_at: new Date() as any }, availableColumns);
            return await db
                .updateTable('config_facturacion')
                .set(updatePayload)
                .where('empresa_id', '=', empresaId)
                .returningAll()
                .executeTakeFirst()
                .then((row) => this.normalizeForRead(row));
        } else {
            const insertPayload = this.filterByExistingColumns({ ...preparedData, empresa_id: empresaId }, availableColumns);
            return await db
                .insertInto('config_facturacion')
                .values(insertPayload)
                .returningAll()
                .executeTakeFirst()
                .then((row) => this.normalizeForRead(row));
        }
    }
}
