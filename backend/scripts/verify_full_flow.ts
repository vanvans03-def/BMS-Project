
import { sql } from '../src/db'
import { historyCleanupService } from '../src/services/history-cleanup.service'

const DEVICE_ID = 28 // Device-1234

async function verifyFullFlow() {
    console.log(`🚀 Starting Full Flow Verification for Device ID: ${DEVICE_ID}`)

    try {
        // 1. Get a Point ID for this device
        const points = await sql`SELECT id, point_name, device_id, report_table_name FROM points WHERE device_id = ${DEVICE_ID} LIMIT 1`
        if (points.length === 0) {
            throw new Error(`Device ${DEVICE_ID} has no points! Cannot test.`)
        }
        const point = points[0]!
        console.log(`✅ Found Point: ${point.point_name} (ID: ${point.id})`)

        // 2. Resolve Table Name (Dynamic Tables)
        let tableName = point.report_table_name
        if (!tableName) {
            console.log('⚠️ Point has no report_table_name. Provisioning now...')
            const devices = await sql`SELECT device_name FROM devices WHERE id = ${DEVICE_ID}`
            const deviceName = devices[0]!.device_name
            tableName = `table_${deviceName}_${point.point_name}`.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() // Simple sanitization, better to import historyTableService if possible but this is a script.

            // Or just fail if we want to be strict.
            // But let's verify if the services we tested (history-logger) actually work.
            // If report_table_name is null, it means history-logger hasn't run or provisioned it yet.
            // We can manually create it for the test.

            await sql.unsafe(`CREATE TABLE IF NOT EXISTS ${tableName} (timestamp TIMESTAMP WITH TIME ZONE PRIMARY KEY, value FLOAT, quality_code TEXT)`)
            await sql`UPDATE points SET report_table_name = ${tableName} WHERE id = ${point.id}`
            console.log(`✅ Provisioned table: ${tableName}`)
        } else {
            console.log(`✅ Using existing table: ${tableName}`)
        }

        // 3. Prepare Data
        const now = new Date()
        const oldDate = new Date()
        oldDate.setDate(now.getDate() - 120) // 120 days old

        console.log('📝 Inserting Test Data...')

        // Insert RECENT log
        await sql.unsafe(`
            INSERT INTO ${tableName} (value, timestamp, quality_code)
            VALUES (123.45, '${now.toISOString()}', 'TEST_RECENT')
        `)
        console.log('   -> Created RECENT Log')

        // Insert OLD log
        await sql.unsafe(`
            INSERT INTO ${tableName} (value, timestamp, quality_code)
            VALUES (678.90, '${oldDate.toISOString()}', 'TEST_OLD')
        `)
        console.log('   -> Created OLD Log')

        // 4. Test Cleanup Service
        console.log('🧹 Running History Cleanup Service...')
        await historyCleanupService.runCleanup()

        // 5. Verify Deletion
        const checkRecent = await sql.unsafe(`SELECT timestamp FROM ${tableName} WHERE quality_code = 'TEST_RECENT'`)
        const checkOld = await sql.unsafe(`SELECT timestamp FROM ${tableName} WHERE quality_code = 'TEST_OLD'`)

        if (checkRecent.length > 0) {
            console.log('✅ Cleanup Verification 1/2: Recent log was PRESERVED.')
        } else {
            console.error('❌ Cleanup Verification 1/2: Recent log was DELETED! (FAIL)')
        }

        if (checkOld.length === 0) {
            console.log('✅ Cleanup Verification 2/2: Old log was DELETED.')
        } else {
            console.error('❌ Cleanup Verification 2/2: Old log STILL EXISTS! (FAIL)')
        }

        // Cleanup the test "recent" log to be polite
        await sql.unsafe(`DELETE FROM ${tableName} WHERE quality_code = 'TEST_RECENT'`)
        console.log('🧹 Cleaned up test artifact (Recent Log).')


    } catch (err) {
        console.error('❌ Verification Failed:', err)
    } finally {
        process.exit(0)
    }
}

verifyFullFlow()
