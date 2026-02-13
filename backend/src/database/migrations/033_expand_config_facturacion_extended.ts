import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  const columnsToAdd = [
    { name: 'ubicacion_geografica', type: 'text' },
    { name: 'telefono2', type: 'text' },
    { name: 'correo_electronico', type: 'text' },
    { name: 'responsabilidad_tributaria', type: 'text' },
    { name: 'zona', type: 'text' },
    { name: 'sitio_web', type: 'text' },
    { name: 'alias', type: 'text' },
    { name: 'actividad_economica', type: 'text' },
    { name: 'descripcion', type: 'text' },
    { name: 'logo', type: 'text' },
    { name: 'updated_at', type: 'timestamp without time zone default now()' }
  ]

  for (const column of columnsToAdd) {
    const exists = await sql<{ column_name: string }>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'config_facturacion'
        AND column_name = ${column.name}
    `.execute(db)

    if (exists.rows.length === 0) {
      await sql.raw(`ALTER TABLE config_facturacion ADD COLUMN ${column.name} ${column.type}`).execute(db)
    }
  }
}

export async function down(_db: Kysely<any>): Promise<void> {
  // No se elimina en down para evitar pérdida de datos en producción.
}
