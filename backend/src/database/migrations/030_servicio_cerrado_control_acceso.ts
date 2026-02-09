import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Agregar campos de servicio cerrado a la tabla empresas
  await db.schema
    .alterTable('empresas')
    .addColumn('servicio_cerrado', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('servicio_cerrado_desde', 'timestamptz')
    .addColumn('servicio_cerrado_por', 'uuid')
    .addColumn('horario_acceso_activo', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('horario_acceso_inicio', 'time')
    .addColumn('horario_acceso_fin', 'time')
    .execute()

  // 2. Crear tabla de auditoría de control de acceso (separada de auditoria_saas)
  await db.schema
    .createTable('auditoria_acceso')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('empresa_id', 'uuid', (col) => col.notNull())
    .addColumn('usuario_id', 'uuid')
    .addColumn('accion', 'varchar(100)', (col) => col.notNull())
    .addColumn('detalles', 'jsonb', (col) => col.defaultTo(sql`'{}'::jsonb`))
    .addColumn('ip_address', 'varchar(45)')
    .addColumn('user_agent', 'text')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute()

  // 3. Índices para rendimiento
  await db.schema
    .createIndex('idx_auditoria_acceso_empresa')
    .on('auditoria_acceso')
    .column('empresa_id')
    .execute()

  await db.schema
    .createIndex('idx_auditoria_acceso_accion')
    .on('auditoria_acceso')
    .column('accion')
    .execute()

  await db.schema
    .createIndex('idx_auditoria_acceso_created')
    .on('auditoria_acceso')
    .column('created_at')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('auditoria_acceso').ifExists().execute()

  await db.schema
    .alterTable('empresas')
    .dropColumn('servicio_cerrado')
    .dropColumn('servicio_cerrado_desde')
    .dropColumn('servicio_cerrado_por')
    .dropColumn('horario_acceso_activo')
    .dropColumn('horario_acceso_inicio')
    .dropColumn('horario_acceso_fin')
    .execute()
}
