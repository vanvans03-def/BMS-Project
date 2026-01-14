import { sql } from '../src/db'

async function verify() {
  console.log('🧪 Starting Verification...')

  try {
    // 1. Verify is_history_enabled EXISTS in Devices (Migration 4 added it)
    const deviceCols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'devices' 
      AND column_name = 'is_history_enabled';
    `
    console.log('📋 Devices Table History Column (Should be 1):', deviceCols.length)
    if (deviceCols.length !== 1) throw new Error('is_history_enabled missing in devices')

    // 2. Verify history_logs table is GONE (Migration 12 dropped it)
    const historyTable = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'history_logs';
    `
    console.log('📋 History Logs Table Exists (Should be false):', historyTable.length > 0)
    if (historyTable.length > 0) throw new Error('history_logs table still exists')

    // 3. Verify audit_logs has protocol column (Migration 13 added it)
    const auditCols = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs' 
      AND column_name = 'protocol';
    `
    console.log('📋 Audit Logs Protocol Column (Should be 1):', auditCols.length)
    if (auditCols.length !== 1) throw new Error('protocol column missing in audit_logs')

    console.log('✅ Setup Verification Passed!')
  } catch (err) {
    console.error('❌ Verification Failed:', err)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

verify()
