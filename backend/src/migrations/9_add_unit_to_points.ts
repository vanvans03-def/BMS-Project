import { sql } from '../db'

async function migrate() {
    console.log('🔄 Adding unit column to points...')
    try {
        await sql`
            ALTER TABLE points 
            ADD COLUMN IF NOT EXISTS unit VARCHAR(20);
        `
        console.log('✅ Unit column added')
    } catch (error) {
        console.error('❌ Migration Failed:', error)
    } finally {
        process.exit(0)
    }
}

migrate()
