import { sql } from './src/db'

async function verify() {
    console.log('🧪 Starting Verification...')

    try {
        // 1. Verify Columns in Devices Table
        const deviceCols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'devices' 
      AND column_name IN ('floor', 'room', 'zone', 'type_cabinet', 'panel_name', 'circuit_breaker', 'phase');
    `
        console.log('📋 Devices Table New Columns:', deviceCols.length)
        if (deviceCols.length !== 7) throw new Error('Missing columns in devices table')

        // 2. Verify Columns in Points Table
        const pointCols = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'points' 
      AND column_name IN ('point_mark', 'report_table_name');
    `
        console.log('📋 Points Table New Columns:', pointCols.length)
        if (pointCols.length !== 2) throw new Error('Missing columns in points table')

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
    } finally {
        process.exit(0)
    }
}

verify()
