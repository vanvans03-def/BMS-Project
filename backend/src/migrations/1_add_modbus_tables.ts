import { sql } from '../db'

async function migrate() {
  console.log('🔄 Starting Modbus Migration...')

  try {
    console.log('📦 Altering table: devices')
    await sql`
      ALTER TABLE devices 
      ADD COLUMN IF NOT EXISTS protocol VARCHAR(50) DEFAULT 'BACNET',
      ADD COLUMN IF NOT EXISTS unit_id INTEGER;
    `

    console.log('📦 Altering table: points')
    await sql`
      ALTER TABLE points 
      ADD COLUMN IF NOT EXISTS register_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS data_type VARCHAR(50);
    `

    console.log('📦 Altering table: audit_logs')
    await sql`
      ALTER TABLE audit_logs 
      ADD COLUMN IF NOT EXISTS protocol VARCHAR(50);
    `

    console.log('✅ Migration Completed Successfully!')
  } catch (error) {
    console.error('❌ Migration Failed:', error)
  } finally {
    process.exit(0)
  }
}

migrate()