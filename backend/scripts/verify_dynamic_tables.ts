
import { sql } from '../src/db'
import { historyTableService } from '../src/services/history-table.service'
import { historyLoggerService } from '../src/services/history-logger.service'

async function verifyDynamicTables() {
    console.log('🧪 Verifying Dynamic Table Refactor...')

    try {
        const DEVICE_ID = 28 // Device-1234

        // 1. Trigger Provisioning
        console.log('📦 Triggering Provisioning for Device 28...')
        await historyTableService.provisionTablesForDevice(DEVICE_ID)

        // 2. Check if tables exist
        const points = await sql`SELECT point_name FROM points WHERE device_id = ${DEVICE_ID}`
        console.log(`   Expect ${points.length} tables...`)

        for (const p of points) {
            const tableName = historyTableService.getTableName('Device-1234', p.point_name)
            const exists = await sql`
                SELECT to_regclass(${tableName}) as reg;
            `
            if (exists[0]?.reg) {
                console.log(`   ✅ Table exists: ${tableName}`)
            } else {
                console.error(`   ❌ Table MISSING: ${tableName}`)
            }
        }

        // 3. Simulate Logging (Wait for Logger or Manual Poll)
        // Since logger runs in main process, we can't easily hook into it here unless we run this script separately.
        // We can manually insert a record into one of the tables to verify structural integrity.

        if (points.length > 0) {
            const testPoint = points[0]
            if (!testPoint) throw new Error('No test point found')

            const tableName = historyTableService.getTableName('Device-1234', testPoint.point_name)

            console.log(`📝 Inserting test data into ${tableName}...`)
            await sql.unsafe(`
                INSERT INTO ${tableName} (value, timestamp) VALUES (999.99, NOW())
            `)

            const row = await sql.unsafe(`SELECT * FROM ${tableName} ORDER BY timestamp DESC LIMIT 1`)
            if (row.length > 0 && row[0]?.value === 999.99) {
                console.log(`   ✅ Insert/Select Successful on ${tableName}`)
            } else {
                console.error(`   ❌ Insert failed or data mismatch on ${tableName}`)
            }
        }

    } catch (err) {
        console.error('❌ Verification Failed:', err)
    } finally {
        process.exit(0)
    }
}

verifyDynamicTables()
