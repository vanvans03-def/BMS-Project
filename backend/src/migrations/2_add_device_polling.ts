import { sql } from '../db'

async function migrate() {
  console.log('🔄 Starting Device Polling Interval Migration...')

  try {
    console.log('📦 Altering table: devices')
    // เพิ่ม column polling_interval หน่วยเป็น ms (nullable)
    // ถ้าเป็น NULL คือให้ใช้ค่า Global Default
    await sql`
      ALTER TABLE devices 
      ADD COLUMN IF NOT EXISTS polling_interval INTEGER DEFAULT NULL;
    `

    console.log('✅ Migration Completed Successfully!')
  } catch (error) {
    console.error('❌ Migration Failed:', error)
  } finally {
    process.exit(0)
  }
}

migrate()