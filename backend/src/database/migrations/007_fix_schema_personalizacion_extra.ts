import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Categorias Personalizacion - agregar columnas solo si no existen
  await sql`
    ALTER TABLE categorias_personalizacion
    ADD COLUMN IF NOT EXISTS descripcion TEXT
  `.execute(db)

  // Items Personalizacion - agregar columnas solo si no existen
  await sql`
    ALTER TABLE items_personalizacion
    ADD COLUMN IF NOT EXISTS descripcion TEXT
  `.execute(db)

  await sql`
    ALTER TABLE items_personalizacion
    ADD COLUMN IF NOT EXISTS precio_adicional INTEGER DEFAULT 0
  `.execute(db)

  await sql`
    ALTER TABLE items_personalizacion
    ADD COLUMN IF NOT EXISTS usa_insumos BOOLEAN DEFAULT false
  `.execute(db)

  await sql`
    ALTER TABLE items_personalizacion
    ADD COLUMN IF NOT EXISTS cantidad_inicial DECIMAL DEFAULT 0
  `.execute(db)

  await sql`
    ALTER TABLE items_personalizacion
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now()
  `.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('categorias_personalizacion')
    .dropColumn('descripcion')
    .execute()

  await db.schema
    .alterTable('items_personalizacion')
    .dropColumn('descripcion')
    .dropColumn('precio_adicional')
    .dropColumn('usa_insumos')
    .dropColumn('cantidad_inicial')
    .dropColumn('updated_at')
    .execute()
}

