
import { sql } from '../src/db'
import { historyCleanupService } from '../src/services/history-cleanup.service'

async function verifyCleanup() {
    console.log('🧪 Verifying History Cleanup (Dynamic Tables)...')

    // 1. Find a valid dynamic table
    const points = await sql`
        SELECT id, point_name, report_table_name 
        FROM points 
        WHERE report_table_name IS NOT NULL 
        LIMIT 1
    `
    if (points.length === 0) {
        console.error('❌ No dynamic tables found to test cleanup')
        process.exit(1)
    }
    const point = points[0]
    const tableName = point.report_table_name
    console.log(`📋 Using table: ${tableName} (Point: ${point.point_name})`)

    // 2. Insert Dummy Old Data (100 days old)
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 100)

    console.log(`📝 Inserting dummy old record at ${oldDate.toISOString()}...`)

    // Using sql.unsafe for dynamic table name
    await sql.unsafe(`
        INSERT INTO ${tableName} (value, timestamp, quality_code)
        VALUES (999.99, '${oldDate.toISOString()}', 'cleanup_test')
    `)

    // 3. Verify it exists
    const check1 = await sql.unsafe(`
        SELECT * FROM ${tableName} WHERE quality_code = 'cleanup_test'
    `)
    if (check1.length === 0) {
        console.error('❌ Failed to insert dummy record')
        process.exit(1)
    }
    console.log('   -> Record inserted successfully')

    // 4. Run Cleanup
    console.log('🧹 Running Cleanup (Manually triggering)...')
    await historyCleanupService.runCleanup()

    // 5. Verify it is gone
    const check2 = await sql.unsafe(`
        SELECT * FROM ${tableName} WHERE quality_code = 'cleanup_test'
    `)

    if (check2.length === 0) {
        console.log('✅ Verification Passed: Old record was deleted.')
    } else {
        console.error('❌ Verification Failed: Old record STILL EXISTS.')
    }

    process.exit(0)
}

verifyCleanup()
