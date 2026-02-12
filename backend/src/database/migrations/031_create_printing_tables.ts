import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Tablas para impresión remota (cola + agentes locales)
  // Usamos gen_random_uuid() (pgcrypto). En Render suele estar disponible; si no, habilitar extensión.
  await sql`create extension if not exists pgcrypto`.execute(db)

  await db.schema
    .createTable('printers')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('name', 'text', (col) => col.notNull())
    // Guardamos hash del apiKey (no el secreto en texto plano)
    .addColumn('api_key_hash', 'text', (col) => col.notNull())
    .addColumn('meta', 'jsonb')
    .addColumn('is_default', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('activo', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('last_seen_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .createTable('print_jobs')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('printer_id', 'uuid', (col) => col.notNull().references('printers.id').onDelete('cascade'))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('external_id', 'text', (col) => col.notNull())
    .addColumn('type', 'text', (col) => col.notNull())
    .addColumn('payload', 'jsonb', (col) => col.notNull())
    // pending -> processing -> done | failed
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('pending'))
    .addColumn('attempts', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('last_error', 'text')
    .addColumn('info', 'text')
    .addColumn('printed_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute()

  // Índices básicos
  await sql`create index if not exists printers_empresa_id_idx on printers (empresa_id)`.execute(db)
  await sql`create index if not exists printers_last_seen_idx on printers (last_seen_at desc)`.execute(db)

  await sql`create index if not exists print_jobs_printer_status_created_idx on print_jobs (printer_id, status, created_at)`.execute(db)
  await sql`create index if not exists print_jobs_empresa_status_created_idx on print_jobs (empresa_id, status, created_at)`.execute(db)

  // Idempotencia: no duplicar jobs por external_id+printer_id+type mientras no esté failed
  await sql`
    create unique index if not exists print_jobs_unique_active
    on print_jobs (printer_id, external_id, type)
    where status <> 'failed'
  `.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('print_jobs').ifExists().execute()
  await db.schema.dropTable('printers').ifExists().execute()
}
