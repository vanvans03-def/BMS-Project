import { sql } from '../db'

async function migrate() {
    console.log('🔄 Adding Status Columns to Devices...')
    try {
        await sql`
            ALTER TABLE devices 
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline',
            ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;
        `

        // Optionally update existing devices to offline if null (though default handles new ones)
        // await sql`UPDATE devices SET status = 'offline' WHERE status IS NULL`

        console.log('✅ Device Status Columns Added')
    } catch (error) {
        console.error('❌ Migration Failed:', error)
    } finally {
        process.exit(0)
    }
}

migrate()
