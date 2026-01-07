import { sql } from '../db'

async function migrate() {
    console.log('🔄 Starting Report Support Migration...')

    try {
        // 1. Devices Table
        console.log('📦 Altering table: devices')
        await sql`
      ALTER TABLE devices 
      ADD COLUMN IF NOT EXISTS floor VARCHAR(50),
      ADD COLUMN IF NOT EXISTS room VARCHAR(100),
      ADD COLUMN IF NOT EXISTS zone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS type_cabinet VARCHAR(50),
      ADD COLUMN IF NOT EXISTS panel_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS circuit_breaker VARCHAR(50),
      ADD COLUMN IF NOT EXISTS phase VARCHAR(10);
    `

        // 2. Points Table
        console.log('📦 Altering table: points')
        await sql`
      ALTER TABLE points 
      ADD COLUMN IF NOT EXISTS point_mark VARCHAR(50),
      ADD COLUMN IF NOT EXISTS report_table_name VARCHAR(100);
    `

        // 3. History Logs Table
        console.log('📦 Creating table: history_logs')
        await sql`
      CREATE TABLE IF NOT EXISTS history_logs (
        id SERIAL PRIMARY KEY,
        point_id INTEGER REFERENCES points(id),
        value DOUBLE PRECISION NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        quality_code VARCHAR(20) DEFAULT 'good'
      );
    `
        // Indexing for performance
        await sql`CREATE INDEX IF NOT EXISTS idx_history_logs_point_id ON history_logs(point_id);`
        await sql`CREATE INDEX IF NOT EXISTS idx_history_logs_timestamp ON history_logs(timestamp);`

        console.log('✅ Migration Completed Successfully!')
    } catch (error) {
        console.error('❌ Migration Failed:', error)
    } finally {
        process.exit(0)
    }
}

migrate()
