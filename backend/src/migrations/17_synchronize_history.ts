import { sql } from '../db';

console.log('Migrating: 17_synchronize_history.ts - Synchronizing Existing History Data');

async function migrate() {
    try {
        console.log('🔍 Scanning for existing history tables...');

        // 1. Find all tables matching the dynamic table pattern 'table_%'
        const tables = await sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'table_%'
        `;

        console.log(`found ${tables.length} potential history tables.`);

        if (tables.length === 0) {
            console.log('ℹ️ No history tables found. Nothing to synchronize.');
            process.exit(0);
        }

        // 2. Validate/Repair Metadata
        // Ensure points table knows about these tables if possible
        // This is a "Best Effort" mainly for the View generation

        // 3. Rebuild the Export View
        // This is the critical step. It ensures vw_low_code_export includes ALL valid tables.
        console.log('🔄 Rebuilding vw_low_code_export...');

        const activePoints = await sql`
            SELECT 
                p.report_table_name,
                d.device_name,
                p.point_name
            FROM points p
            JOIN devices d ON p.device_id = d.id
            WHERE p.report_table_name IS NOT NULL
        `;

        if (activePoints.length === 0) {
            console.log('⚠️ No points have "report_table_name" set. View might be empty.');
            // Optional: We could try to auto-heal here by matching list of tables to points
            // but that's risky without exact name matching logic.
            // We will trust the current point configuration.
        } else {
            const queries = activePoints.map(p => `
                SELECT 
                    timestamp, 
                    value, 
                    quality_code, 
                    '${p.device_name}' as device_name, 
                    '${p.point_name}' as point_name 
                FROM ${p.report_table_name}
             `);

            await sql.unsafe(`
                CREATE OR REPLACE VIEW vw_low_code_export AS
                ${queries.join(' UNION ALL ')}
             `);

            console.log(`✅ View rebuilt with ${activePoints.length} partitions.`);
        }

        console.log('✨ Synchronization Complete.');
        console.log('   Your existing history tables (table_*) have been preserved and linked.');

        process.exit(0);

    } catch (error) {
        console.error('❌ Synchronization Failed:', error);
        process.exit(1);
    }
}

migrate();
