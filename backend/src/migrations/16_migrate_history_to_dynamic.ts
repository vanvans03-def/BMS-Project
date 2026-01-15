import { sql } from '../db';

console.log('Migrating: 16_migrate_history_to_dynamic.ts - Moving Legacy Data');

async function migrate() {
    try {
        // 1. Check if history_logs exists
        const [tableCheck] = await sql`
            SELECT to_regclass('history_logs') as exists
        `;

        if (!tableCheck!.exists) {
            console.log('ℹ️ Table "history_logs" does not exist. Skipping data migration.');
            return;
        }

        // 2. Fetch all legacy logs with metadata
        console.log('📊 Fetching legacy logs...');
        const logs = await sql`
            SELECT 
                h.value,
                h.created_at as timestamp,  -- Assuming 'created_at' is the timestamp column
                p.point_name,
                p.id as point_id,
                d.device_name
            FROM history_logs h
            JOIN points p ON h.point_id = p.id
            JOIN devices d ON p.device_id = d.id -- Correctly links via point's device (not h.device_id necessarily)
        `;

        if (logs.length === 0) {
            console.log('ℹ️ No data in "history_logs".');
            return;
        }

        console.log(`Found ${logs.length} logs to migrate.`);

        // Helper to sanitize matching the service logic
        const getTableName = (dev: string, pt: string) => {
            const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            return `table_${sanitize(dev)}_${sanitize(pt)}`.replace(/_+/g, '_');
        }

        // 3. Group by table to batch inserts
        const logsByTable: Record<string, typeof logs[number][]> = {};
        const tableToPointId: Record<string, number> = {};

        for (const log of logs) {
            const tableName = getTableName(log.device_name, log.point_name);
            if (!logsByTable[tableName]) {
                logsByTable[tableName] = [];
                tableToPointId[tableName] = log.point_id;
            }
            logsByTable[tableName]!.push(log);
        }

        // 4. Create tables and insert data
        for (const [tableName, tableLogs] of Object.entries(logsByTable)) {
            console.log(`Processing ${tableName} (${tableLogs.length} rows)...`);

            // Creates table
            await sql.unsafe(`
                CREATE TABLE IF NOT EXISTS ${tableName} (
                    timestamp TIMESTAMP WITH TIME ZONE PRIMARY KEY DEFAULT NOW(),
                    value DOUBLE PRECISION,
                    quality_code VARCHAR(50) DEFAULT 'good'
                );
            `);

            // Insert data
            // Batch insert is tricky with dynamic table name in simple sql helper, using loop for safety or unsafe batch
            // For simple migration script, loop is fine or constructed query
            // We'll use a transaction for each table to be faster

            await sql.begin(async (tx) => {
                for (const log of tableLogs) {
                    // Check for duplicate PK?
                    await tx.unsafe(`
                        INSERT INTO ${tableName} (timestamp, value, quality_code)
                        VALUES ($1, $2, 'legacy')
                        ON CONFLICT (timestamp) DO NOTHING
                     `, [log.timestamp, log.value]);
                }
            });

            // Update point metadata
            await sql`
                UPDATE points 
                SET report_table_name = ${tableName}, is_history_enabled = true
                WHERE id = ${tableToPointId[tableName]!}
            `;
        }

        console.log('✅ Data migrated.');

        // 5. Rebuild View (Simplified version of service logic)
        console.log('🔄 Rebuilding Export View...');
        const points = await sql`SELECT report_table_name, device_name, point_name FROM points JOIN devices ON points.device_id = devices.id WHERE report_table_name IS NOT NULL`;

        if (points.length > 0) {
            const queries = points.map(p => `
                SELECT timestamp, value, quality_code, '${p.device_name}' as device_name, '${p.point_name}' as point_name 
                FROM ${p.report_table_name}
             `);
            await sql.unsafe(`CREATE OR REPLACE VIEW vw_low_code_export AS ${queries.join(' UNION ALL ')}`);
        }

        console.log('✨ Migration Complete. You can now safely verify data and drop history_logs if desired.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
}

migrate();
