
import { sql } from '../db'

async function migrate() {
    console.log('🔥 Refactoring: Dropping Legacy History Schema...')

    try {
        // 1. Drop Views (Order matters due to dependencies)
        console.log('🗑️ Dropping Views...')
        await sql`DROP VIEW IF EXISTS vw_low_code_export CASCADE`
        await sql`DROP MATERIALIZED VIEW IF EXISTS mv_history_hourly CASCADE`
        await sql`DROP VIEW IF EXISTS vw_device_configuration CASCADE`

        // 2. Drop Table
        console.log('🗑️ Dropping Table: history_logs...')
        await sql`DROP TABLE IF EXISTS history_logs CASCADE`

        // 3. Drop legacy columns from points if they are no longer needed? 
        // Actually, 'report_table_name' might still be useful as metadata, 
        // but the table naming convention is now dynamic. 
        // Let's keep them for now or repurpose them. 
        // User said: "create table in database according to point... table_{deviceName}_{pointName}"
        // So we might not need 'report_table_name' column anymore if we generate it on the fly, 
        // OR we store the generated name there. Let's keep it to store the authoritative table name.

        console.log('✅ Legacy Schema Dropped Successfully.')

    } catch (error) {
        console.error('❌ Migration Failed:', error)
    } finally {
        process.exit(0)
    }
}

migrate()
