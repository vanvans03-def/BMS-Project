import { sql } from '../db'

async function migrate() {
    console.log('🔄 Creating Reporting Views...')

    try {
        // 1. VW_DEVICE_CONFIGURATION
        // Flattens the recursive locations table + device info into a single row per device
        // Columns: device_id, device_name, floor, zone, room, cabinet, etc.
        console.log('📦 Creating View: vw_device_configuration')

        await sql`DROP VIEW IF EXISTS vw_device_configuration CASCADE`
        await sql`
            CREATE OR REPLACE VIEW vw_device_configuration AS
            WITH RECURSIVE location_path AS (
                -- Anchor: Get all locations
                SELECT 
                    id, 
                    parent_id, 
                    name::text, 
                    type::text, 
                    ARRAY[UPPER(type::text)] as type_path,
                    ARRAY[name::text] as name_path
                FROM locations
                WHERE parent_id IS NULL
                
                UNION ALL
                
                -- Recursive: Join children
                SELECT 
                    c.id, 
                    c.parent_id, 
                    c.name::text, 
                    c.type::text, 
                    p.type_path || UPPER(c.type::text),
                    p.name_path || c.name::text
                FROM locations c
                JOIN location_path p ON c.parent_id = p.id
            )
            SELECT 
                d.id as device_id,
                d.device_name,
                d.device_instance_id,
                
                -- Extract hierarchy levels (Scanning the arrays found in recursion)
                -- We use a lateral join specific logic or just simple array scanning if positions are fixed?
                -- Since positions aren't fixed (some branches have 3 levels, some 5), 
                -- we verify "type" array.
                
                (SELECT name_path[array_position(type_path, 'FLOOR')] WHERE 'FLOOR' = ANY(type_path)) as floor,
                (SELECT name_path[array_position(type_path, 'ZONE')] WHERE 'ZONE' = ANY(type_path)) as zone,
                (SELECT name_path[array_position(type_path, 'ROOM')] WHERE 'ROOM' = ANY(type_path)) as room,
                (SELECT name_path[array_position(type_path, 'PANEL')] WHERE 'PANEL' = ANY(type_path)) as panel,
                (SELECT name_path[array_position(type_path, 'CABINET')] WHERE 'CABINET' = ANY(type_path)) as type_cabinet,
                
                lp.name_path as full_path_array
                
            FROM devices d
            LEFT JOIN location_path lp ON d.location_id = lp.id;
        `

        // 2. MV_HISTORY_HOURLY
        // Materialized view for fast querying
        console.log('📦 Creating Materialized View: mv_history_hourly')

        await sql`DROP MATERIALIZED VIEW IF EXISTS mv_history_hourly CASCADE`

        // Note: date_trunc('hour', ...) is standard Postgres
        // We join with devices -> vw_device_configuration -> points
        await sql`
            CREATE MATERIALIZED VIEW mv_history_hourly AS
            SELECT
                date_trunc('hour', hl.timestamp) as time_bucket,
                hl.device_id,
                hl.point_id,
                
                -- Aggregations
                AVG(hl.value) as avg_value,
                MIN(hl.value) as min_value,
                MAX(hl.value) as max_value,
                COUNT(hl.value) as sample_count,
                
                -- Context columns (Denormalized for reporting)
                d.device_name,
                p.point_name,
                p.unit,
                p.report_table_name,
                p.point_mark,
                
                -- Location Context
                vc.floor,
                vc.zone,
                vc.room,
                vc.panel,
                vc.type_cabinet
                
            FROM history_logs hl
            JOIN points p ON hl.point_id = p.id
            JOIN devices d ON hl.device_id = d.id
            LEFT JOIN vw_device_configuration vc ON d.id = vc.device_id
            
            GROUP BY 
                1, -- time_bucket
                hl.device_id, 
                hl.point_id, 
                d.device_name, 
                p.point_name, 
                p.unit,
                p.report_table_name,
                p.point_mark,
                vc.floor, vc.zone, vc.room, vc.panel, vc.type_cabinet
            
            WITH NO DATA;
        `

        // 3. VW_LOW_CODE_EXPORT (Exact Format requested by User)
        console.log('📦 Creating View: vw_low_code_export')
        await sql`DROP VIEW IF EXISTS vw_low_code_export`
        await sql`
            CREATE VIEW vw_low_code_export AS
            SELECT
                ROW_NUMBER() OVER (ORDER BY time_bucket DESC, device_name ASC) as "No",
                'Record' as "Source",
                unit as "Unit",
                to_char(time_bucket, 'DD-Mon-YYYY') as "Activate Date",
                report_table_name as "Table Name",
                point_mark as "Mark",
                type_cabinet as "Type Cabinet",
                zone as "Zone",
                panel as "Panel",
                device_name as "Cb", -- Mapping Device Name to CB
                floor as "Floor",
                '' as "Phase", -- Placeholder as Phase missing in DB
                room as "Room",
                avg_value as "Value" -- Adding Value column as it's essential
            FROM mv_history_hourly
        `

        // Index for performance
        console.log('📦 Indexing Views...')
        await sql`CREATE INDEX idx_mv_history_hourly_time ON mv_history_hourly(time_bucket DESC);`
        await sql`CREATE INDEX idx_mv_history_hourly_device ON mv_history_hourly(device_id);`

        // Populate Data
        console.log('📦 Populating Initial Data (Refresh)...')
        await sql`REFRESH MATERIALIZED VIEW mv_history_hourly`

        console.log('✅ Reporting Views Created Successfully')
    } catch (error) {
        console.error('❌ Migration Failed:', error)
    } finally {
        process.exit(0)
    }
}

migrate()
