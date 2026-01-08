
import { sql } from '../db'

export const historyTableService = {
    /**
     * Generates a safe table name for a device point.
     * Format: table_{deviceName}_{pointName}
     * Sanitizes: spaces to underscores, removes special chars, lowercases.
     */
    getTableName(deviceName: string, pointName: string): string {
        const sanitize = (str: string) =>
            str.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()

        // Remove repeated underscores if any
        const stable = `table_${sanitize(deviceName)}_${sanitize(pointName)}`.replace(/_+/g, '_')
        return stable
    },

    /**
     * Creates the table if it doesn't exist.
     * Table logic: timestamp (PK), value, quality_code
     */
    async ensureTableExists(tableName: string) {
        // Note: We cannot use ${} for table identifiers in postgres.js easily without sql.unsafe or sql(table)
        // Using sql(tableName) helper if available, or sql.unsafe for DDL.
        // Ideally user trusted input should be sanitized. getTableName does sanitization.

        try {
            await sql.unsafe(`
            CREATE TABLE IF NOT EXISTS ${tableName} (
                timestamp TIMESTAMP WITH TIME ZONE PRIMARY KEY DEFAULT NOW(),
                value DOUBLE PRECISION,
                quality_code VARCHAR(50) DEFAULT 'good'
            );
            
            -- Optional: Add TimescaleDB hypertable if available (omitted for now to keep simple)
        `)
        } catch (err) {
            console.error(`❌ Failed to create table ${tableName}:`, err)
        }
    },

    /**
     * Provisions tables for all points of a specific device.
     * Called when Enabling History.
     */
    async provisionTablesForDevice(deviceId: number) {
        try {
            // Fetch device and points
            const devices = await sql`SELECT device_name FROM devices WHERE id = ${deviceId}`
            if (devices.length === 0) return

            const deviceName = devices[0]!.device_name
            const points = await sql`SELECT id, point_name FROM points WHERE device_id = ${deviceId}`

            console.log(`📦 Provisioning Tables for Device: ${deviceName} (${points.length} points)...`)

            for (const point of points) {
                const tableName = this.getTableName(deviceName, point.point_name)
                await this.ensureTableExists(tableName)

                // Store table name
                await sql`
                UPDATE points 
                SET report_table_name = ${tableName} 
                WHERE id = ${point.id}
            `
            }
            console.log(`✅ Provisioning Complete for ${deviceName}`)

            // Rebuild View
            await this.rebuildExportView()

        } catch (err) {
            console.error('❌ Provisioning Failed:', err)
        }
    },

    /**
     * Rebuilds the 'vw_low_code_export' view by UNION ALL-ing all dynamic tables.
     * This is required because our tables are dynamic, but low-code tools expect a single static view.
     */
    async rebuildExportView() {
        console.log('🔄 Rebuilding Low Code Export View...')
        try {
            // 1. Get all active tables
            const points = await sql`
            SELECT 
                p.report_table_name,
                d.device_name,
                p.point_name
            FROM points p
            JOIN devices d ON p.device_id = d.id
            WHERE p.report_table_name IS NOT NULL
        `

            if (points.length === 0) {
                // Create dummy view if no tables
                await sql`
                CREATE OR REPLACE VIEW vw_low_code_export AS
                SELECT 
                    NULL::timestamp as timestamp,
                    NULL::float as value,
                    NULL::text as quality_code,
                    NULL::text as device_name,
                    NULL::text as point_name
                WHERE 1 = 0
            `
                console.log('⚠️ No active history tables. Created dummy view.')
                return
            }

            // 2. Construct UNION ALL Query
            // We use sql.unsafe because we are building a large complex query string from known safe internal table names
            const queries = points.map(p => {
                return `
                SELECT 
                    timestamp,
                    value,
                    quality_code,
                    '${p.device_name}' as device_name,
                    '${p.point_name}' as point_name
                FROM ${p.report_table_name}
            `
            })

            const finalQuery = `
            CREATE OR REPLACE VIEW vw_low_code_export AS
            ${queries.join(' UNION ALL ')}
        `

            await sql.unsafe(finalQuery)
            console.log(`✅ View Rebuilt with ${points.length} partitions.`)

        } catch (err) {
            console.error('❌ Failed to rebuild view:', err)
        }
    }
}
