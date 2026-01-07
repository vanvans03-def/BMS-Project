import { sql } from '../db'

async function migrate() {
    console.log('🔄 Starting Legacy Columns Removal...')

    try {
        console.log('📦 Altering table: devices - Dropping legacy columns')
        await sql`
            ALTER TABLE devices
            DROP COLUMN IF EXISTS floor,
            DROP COLUMN IF EXISTS room,
            DROP COLUMN IF EXISTS zone,
            DROP COLUMN IF EXISTS type_cabinet,
            DROP COLUMN IF EXISTS panel_name,
            DROP COLUMN IF EXISTS circuit_breaker,
            DROP COLUMN IF EXISTS phase;
        `

        console.log('✅ Legacy columns dropped successfully')

    } catch (error) {
        console.error('❌ Migration Failed:', error)
    } finally {
        process.exit(0)
    }
}

migrate()
