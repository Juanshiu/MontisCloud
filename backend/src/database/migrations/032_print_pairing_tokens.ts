import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('printers')
    .addColumn('device_fingerprint', 'text')
    .addColumn('hostname', 'text')
    .addColumn('os_name', 'text')
    .addColumn('last_pairing_at', 'timestamptz')
    .execute()

  await db.schema
    .createTable('print_pairing_tokens')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('token_hash', 'text', (col) => col.notNull())
    .addColumn('alias', 'text')
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('used_at', 'timestamptz')
    .addColumn('used_by_printer_id', 'uuid', (col) => col.references('printers.id').onDelete('set null'))
    .addColumn('created_by_usuario_id', 'uuid', (col) => col.references('usuarios.id').onDelete('set null'))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute()

  await sql`
    create unique index if not exists printers_empresa_fingerprint_unique
    on printers (empresa_id, device_fingerprint)
    where device_fingerprint is not null
  `.execute(db)

  await sql`
    create unique index if not exists print_pairing_tokens_token_hash_unique
    on print_pairing_tokens (token_hash)
  `.execute(db)

  await sql`
    create index if not exists print_pairing_tokens_empresa_expires_idx
    on print_pairing_tokens (empresa_id, expires_at desc)
  `.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('print_pairing_tokens').ifExists().execute()

  await db.schema
    .alterTable('printers')
    .dropColumn('last_pairing_at')
    .dropColumn('os_name')
    .dropColumn('hostname')
    .dropColumn('device_fingerprint')
    .execute()
}
