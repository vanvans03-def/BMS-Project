
import { sql } from '../src/db'

async function verifyHistoryApiDynamic() {
    console.log('🧪 Verifying Dynamic History API Queries...')

    try {
        // 1. Verify List Tables Query
        console.log('📋 Testing List Tables Query...')
        const tables = await sql`
            SELECT 
                p.report_table_name as table_name,
                d.device_name,
                p.point_name
            FROM points p
            JOIN devices d ON p.device_id = d.id
            WHERE p.report_table_name IS NOT NULL
            ORDER BY d.device_name, p.point_name
            LIMIT 5
        `
        console.log(`   ✅ Found ${tables.length} tables. First:`, tables[0] || 'None')

        if (tables.length > 0) {
            const tableName = tables[0]!.table_name
            console.log(`🔍 Testing Query for Table: ${tableName}`)

            // 2. Verify Count Query
            const countResult = await sql`SELECT COUNT(*) as total FROM ${sql(tableName)}`
            const total = Number(countResult[0]?.total || 0)
            console.log(`   ✅ Total records: ${total}`)

            // 3. Verify Data Query
            const logs = await sql`
                SELECT timestamp, value, quality_code
                FROM ${sql(tableName)}
                ORDER BY timestamp DESC
                LIMIT 5
            `
            console.log(`   ✅ Data Query success. Records:`, logs.length)
            if (logs.length > 0) {
                console.log('   Sample:', logs[0])
            }
        } else {
            console.warn('   ⚠️ No tables found to test data query. Provisioning might be needed.')
        }

    } catch (err) {
        console.error('❌ Verification Failed:', err)
    } finally {
        process.exit(0)
    }
}

verifyHistoryApiDynamic()
