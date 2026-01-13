import { sql } from '../src/db'

async function verify() {
  console.log('🧪 Starting Verification...')

  try {
    // 1. Verify is_history_enabled REMOVED from Devices
    const deviceCols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'devices' 
      AND column_name = 'is_history_enabled';
    `
    console.log('📋 Devices Table History Column (Should be 0):', deviceCols.length)
    if (deviceCols.length !== 0) throw new Error('is_history_enabled still exists in devices')

    // 2. Verify is_history_enabled ADDED to Points
    const pointCols = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'points' 
      AND column_name = 'is_history_enabled';
    `
    console.log('📋 Points Table History Column (Should be 1):', pointCols.length)
    if (pointCols.length !== 1) throw new Error('is_history_enabled missing in points')

    // 3. Verify History Logs Table
    const historyTable = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'history_logs';
    `
    console.log('📋 History Logs Table Exists:', historyTable.length > 0)
    if (historyTable.length === 0) throw new Error('history_logs table not found')

    console.log('✅ Setup Verification Passed!')
  } catch (err) {
    console.error('❌ Verification Failed:', err)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

verify()
