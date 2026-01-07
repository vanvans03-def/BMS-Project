import { sql } from './src/db'
import { historyReportService } from './src/services/history-report.service'

async function verify() {
    console.log('🧪 Starting Report Data Verification...')

    try {
        // 0. Pre-Cleanup
        // Delete validation data by matching specific values
        await sql`DELETE FROM history_logs WHERE value = 123.45`
        await sql`DELETE FROM points WHERE report_table_name = 'Table_Test_01'`
        await sql`DELETE FROM devices WHERE device_name = 'TestDevice_001'`

        // Locate test locations
        const testLocs = await sql`SELECT id FROM locations WHERE description = 'Test Floor'`
        if (testLocs.length > 0) {
            // Delete efficiently? Just try delete multiple times to resolve dependencies or disable triggers?
            // We'll try to delete from bottom up by checking parent_id
            // Simple hack: Repeat delete until empty (since we have few)
            for (let i = 0; i < 5; i++) {
                await sql`DELETE FROM locations WHERE description = 'Test Floor' AND id NOT IN (SELECT parent_id FROM locations WHERE parent_id IS NOT NULL)`
            }
            // Force delete any remaining (if cycle? unlikely)
            await sql`DELETE FROM locations WHERE description = 'Test Floor'`
        }

        // 1. Setup Dummy Hierarchy
        const [floor] = await sql`INSERT INTO locations (name, type, description) VALUES ('Floor 1', 'FLOOR', 'Test Floor') RETURNING id`
        if (!floor) throw new Error('Failed to create floor')

        const [zone] = await sql`INSERT INTO locations (name, type, parent_id, description) VALUES ('Zone A', 'ZONE', ${floor!.id}, 'Test Floor') RETURNING id`
        if (!zone) throw new Error('Failed to create zone')

        const [panel] = await sql`INSERT INTO locations (name, type, parent_id, description) VALUES ('Panel X', 'PANEL', ${zone!.id}, 'Test Floor') RETURNING id`
        if (!panel) throw new Error('Failed to create panel')

        console.log(`✅ Hierarchy Created: Floor(${floor!.id}) -> Zone(${zone!.id}) -> Panel(${panel!.id})`)

        // 2. Setup Device & Point
        const [device] = await sql`
      INSERT INTO devices (device_name, device_instance_id, location_id, is_active, protocol)
      VALUES ('TestDevice_001', 999001, ${panel!.id}, true, 'BACNET')
      RETURNING id
    `
        if (!device) throw new Error('Failed to create device')

        // Ensure unit col exists
        const [point] = await sql`
      INSERT INTO points (device_id, object_type, object_instance, unit, report_table_name, point_mark)
      VALUES (${device.id}, 'ANALOG_VALUE', 1, 'kWh', 'Table_Test_01', 'Energy')
      RETURNING id
    `
        if (!point) throw new Error('Failed to create point')

        // 3. Insert History Log
        await sql`
      INSERT INTO history_logs (point_id, device_id, value, timestamp)
      VALUES (${point.id}, ${device.id}, 123.45, NOW())
    `
        console.log('✅ Dummy Data Inserted')

        // 4. Run Report Service
        const startDate = new Date(Date.now() - 86400000).toISOString()
        const endDate = new Date(Date.now() + 86400000).toISOString()

        const report = await historyReportService.getReportData(startDate, endDate)

        // 5. Verify Output
        const row = report.find(r => r.table_name === 'Table_Test_01')

        if (row) {
            console.log('📄 Report Row Found:', JSON.stringify(row, null, 2))

            if (row.floor === 'Floor 1' && row.zone === 'Zone A' && row.panel === 'Panel X') {
                console.log('✅ PASS: Hierarchy successfully resolved!')
            } else {
                console.error('❌ FAIL: Hierarchy mismatch', {
                    expected: { floor: 'Floor 1', zone: 'Zone A', panel: 'Panel X' },
                    actual: { floor: row.floor, zone: row.zone, panel: row.panel }
                })
            }
        } else {
            console.error('❌ FAIL: No report row generated')
        }

        // Cleanup finally
        // Same robust cleanup
        await sql`DELETE FROM history_logs WHERE point_id = ${point.id}`
        await sql`DELETE FROM points WHERE id = ${point.id}`
        await sql`DELETE FROM devices WHERE id = ${device.id}`
        await sql`DELETE FROM locations WHERE description = 'Test Floor' AND id NOT IN (SELECT parent_id FROM locations WHERE parent_id IS NOT NULL)`
        await sql`DELETE FROM locations WHERE description = 'Test Floor' AND id NOT IN (SELECT parent_id FROM locations WHERE parent_id IS NOT NULL)`
        await sql`DELETE FROM locations WHERE description = 'Test Floor'`

        console.log('✓ Done')

    } catch (error) {
        console.error('❌ Error:', error)
    } finally {
        process.exit(0)
    }
}

verify()
