import { sql } from '../db';

console.log('Migrating: 16_verify_history_data.ts - Verifying Log Integrity');

async function migrate() {
    try {
        // 1. Count total logs
        const [total] = await sql`SELECT COUNT(*) as count FROM history_logs`;
        const totalCount = Number(total!.count);

        if (totalCount === 0) {
            console.log('ℹ️ No history logs found. System is clean.');
            process.exit(0);
        }

        console.log(`📊 Total History Logs: ${totalCount}`);

        // 2. Check linkage to Points (primary link)
        // If history_logs uses point_id, this must match
        const [validPoints] = await sql`
            SELECT COUNT(*) as count 
            FROM history_logs h
            JOIN points p ON h.point_id = p.id
        `;
        const validPointCount = Number(validPoints!.count);

        // 3. Check linkage to Devices (secondary link via migration 5)
        // Checks if device_id in history_logs matches current devices
        const [validDevices] = await sql`
            SELECT COUNT(*) as count 
            FROM history_logs h
            JOIN devices d ON h.device_id = d.id
        `;
        const validDeviceCount = Number(validDevices!.count);

        console.log(`✅ Logs with valid Point linkage: ${validPointCount}`);
        console.log(`✅ Logs with valid Device linkage: ${validDeviceCount}`);

        if (validPointCount === totalCount && validDeviceCount === totalCount) {
            console.log('✨ All history logs are correctly linked to the new hierarchy!');
            console.log('   (Note: Device IDs were preserved during the hierarchy update, so no data movement is needed.)');
        } else {
            const missing = totalCount - validPointCount;
            console.warn(`⚠️ Warning: ${missing} logs appear to be orphaned (missing point or device).`);
            console.log('   This might be from previously deleted devices/points, independent of the recent migration.');
        }

        process.exit(0);

    } catch (error) {
        console.error('Migration Verification Failed:', error);
        process.exit(1);
    }
}

migrate();
