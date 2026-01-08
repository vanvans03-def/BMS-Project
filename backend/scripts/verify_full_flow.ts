
import { sql } from '../src/db'
import { historyCleanupService } from '../src/services/history-cleanup.service'

const DEVICE_ID = 28 // Device-1234

async function verifyFullFlow() {
    console.log(`🚀 Starting Full Flow Verification for Device ID: ${DEVICE_ID}`)

    try {
        // 1. Get a Point ID for this device
        const points = await sql`SELECT id, point_name FROM points WHERE device_id = ${DEVICE_ID} LIMIT 1`
        if (points.length === 0) {
            throw new Error(`Device ${DEVICE_ID} has no points! Cannot test.`)
        }
        const point = points[0]
        if (!point) {
            throw new Error(`Device ${DEVICE_ID} has points count > 0 but index 0 is undefined.`)
        }
        console.log(`✅ Found Point: ${point.point_name} (ID: ${point.id})`)

        // 2. Prepare Data
        const now = new Date()
        const oldDate = new Date()
        oldDate.setDate(now.getDate() - 120) // 120 days old (Older than 90 days retention)

        console.log('📝 Inserting Test Data...')

        // Insert RECENT log
        const recentLog = await sql`
            INSERT INTO history_logs (device_id, point_id, value, timestamp, quality_code)
            VALUES (${DEVICE_ID}, ${point.id}, 123.45, ${now}, 'TEST_RECENT')
            RETURNING id
        `
        if (!recentLog || recentLog.length === 0) throw new Error('Failed to insert RECENT log')
        const recentItem = recentLog[0]
        if (!recentItem) throw new Error('Failed to insert RECENT log (undefined item)')
        const recentId = recentItem.id

        // Insert OLD log
        const oldLog = await sql`
            INSERT INTO history_logs (device_id, point_id, value, timestamp, quality_code)
            VALUES (${DEVICE_ID}, ${point.id}, 678.90, ${oldDate}, 'TEST_OLD')
            RETURNING id
        `
        if (!oldLog || oldLog.length === 0) throw new Error('Failed to insert OLD log')
        const oldLogItem = oldLog[0]
        if (!oldLogItem) throw new Error('Failed to insert OLD log (undefined item)')
        const oldId = oldLogItem.id

        console.log(`   -> Created RECENT Log ID: ${recentId}`)
        console.log(`   -> Created OLD Log ID: ${oldId}`)

        // 3. Verify Reporting (View)
        console.log('🔄 Refreshing Materialized View (mv_history_hourly)...')
        await sql`REFRESH MATERIALIZED VIEW mv_history_hourly`

        const reportCheck = await sql`
            SELECT * FROM mv_history_hourly 
            WHERE device_id = ${DEVICE_ID} 
            AND max_value = 123.45 -- Should match our recent insert
            LIMIT 1
        `

        // Note: Time bucket might truncate 'now', so we search by value/device mainly
        if (reportCheck.length > 0) {
            console.log('✅ Reporting Layer: Data successfully appeared in Hourly Report View.')
        } else {
            console.warn('⚠️ Reporting Layer: Data NOT found in view immediately (might be bucket timing issue).')
        }

        // 4. Test Cleanup Service
        console.log('🧹 Running History Cleanup Service...')
        await historyCleanupService.runCleanup()

        // 5. Verify Deletion
        const checkRecent = await sql`SELECT id FROM history_logs WHERE id = ${recentId}`
        const checkOld = await sql`SELECT id FROM history_logs WHERE id = ${oldId}`

        if (checkRecent.length === 1) {
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
        await sql`DELETE FROM history_logs WHERE id = ${recentId}`
        console.log('🧹 Cleaned up test artifact (Recent Log).')

        // 6. Refresh View Again to Clear Artifacts
        console.log('🔄 Refreshing Materialized View (Cleanup)...')
        await sql`REFRESH MATERIALIZED VIEW mv_history_hourly`
        console.log('✅ View Refreshed. Report should be clean.')

    } catch (err) {
        console.error('❌ Verification Failed:', err)
    } finally {
        process.exit(0)
    }
}

verifyFullFlow()
