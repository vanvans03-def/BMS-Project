import { up } from '../src/migrations/13_master_plan_updates'
import { sql } from '../src/db'

async function run() {
    try {
        await up()
        console.log('✅ Migration 13 executed successfully')
    } catch (e) {
        console.error('❌ Migration 13 failed', e)
        process.exit(1)
    } finally {
        await sql.end() // Close connection if needed, though postgres.js handles it usually. 
        process.exit(0)
    }
}

run()
