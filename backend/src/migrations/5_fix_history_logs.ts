import { sql } from '../db'

async function migrate() {
    console.log('🔄 Fixing History Logs Schema...')
    try {
        await sql`
            ALTER TABLE history_logs 
            ADD COLUMN IF NOT EXISTS device_id INTEGER REFERENCES devices(id);
        `
        // Index
        await sql`CREATE INDEX IF NOT EXISTS idx_history_logs_device_id ON history_logs(device_id);`

        console.log('✅ History Logs Schema Fixed')
    } catch (error) {
        console.error('❌ Fix Failed:', error)
    } finally {
        process.exit(0)
    }
}

migrate()
