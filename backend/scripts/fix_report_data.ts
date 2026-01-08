
import { sql } from '../src/db'

async function fixReportData() {
    console.log('🔧 Fixing Test Data for Reports...')

    try {
        // 1. Update Device Location/Metadata (Device-1234 / ID 28)
        // We need to set legacy columns if the view uses them, OR update the locations hierarchy if the view uses that.
        // The view `vw_device_configuration` uses `locations` hierarchy.
        // Let's Check where Device 28 is.

        const deviceCheck = await sql`SELECT location_id FROM devices WHERE id = 28`
        if (deviceCheck.length > 0) {
            // Ensure it has a location. If not, let's create a dummy hierarchy.
            // Assuming the user wants to see "Floor 1", "Zone A".
            // We'll Create Location Paths if they don't exist.

            // For simplicity in this "fix" script, we might just update the `devices` legacy fields 
            // IF the view was falling back to them. 
            // BUT `vw_device_configuration` ONLY uses `locations`.

            // Let's update `locations` table.
            // Create Floor
            const floor = await sql`
                INSERT INTO locations (name, type) VALUES ('Floor 1', 'FLOOR') 
                ON CONFLICT (name, type) DO UPDATE SET name=EXCLUDED.name 
                RETURNING id
            `
            const floorId = floor[0].id

            // Create Zone
            const zone = await sql`
                INSERT INTO locations (name, type, parent_id) VALUES ('Zone A', 'ZONE', ${floorId}) 
                ON CONFLICT (name, type) DO UPDATE SET name=EXCLUDED.name 
                RETURNING id
            `
            const zoneId = zone[0].id

            // Create Panel
            const panel = await sql`
                INSERT INTO locations (name, type, parent_id) VALUES ('Panel_1', 'PANEL', ${zoneId}) 
                ON CONFLICT (name, type) DO UPDATE SET name=EXCLUDED.name 
                RETURNING id
            `
            const panelId = panel[0].id

            // Update Device to point to this Panel
            await sql`UPDATE devices SET location_id = ${panelId} WHERE id = 28`
            console.log('✅ Updated Device 28 Location to Panel_1 -> Zone A -> Floor 1')
        }

        // 2. Update Points Metadata (Table Name, Mark, Unit)
        // Device 28 points
        await sql`
            UPDATE points 
            SET 
                report_table_name = 'Table_DM01_' || point_name,
                point_mark = point_name,
                unit = 'kWh'
            WHERE device_id = 28
        `
        console.log('✅ Updated Points Metadata for Device 28 (Table Name, Mark, Unit)')

        // 3. Refresh Materialized View to pick up changes (Recursively for the device config view change)
        console.log('🔄 Refreshing Views...')
        // We need to refresh vw_device_configuration? It's a valid view (dynamic), so no refresh needed.
        // But mv_history_hourly IS materialized.
        await sql`REFRESH MATERIALIZED VIEW mv_history_hourly`

        console.log('✅ Data Fixed & Views Refreshed.')

    } catch (err) {
        console.error('❌ Fix Failed:', err)
    } finally {
        process.exit(0)
    }
}

fixReportData()
