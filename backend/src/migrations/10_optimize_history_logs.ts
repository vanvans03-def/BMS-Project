import { sql } from '../db'

async function migrate() {
    console.log('🔄 optimizing History Logs Schema...')

    try {
        // 1. Critical Fix: ID Overflow
        // Converting SERIAL (int4) to BIGSERIAL (int8)
        console.log('📦 Altering id to BIGINT...')
        await sql`
            ALTER TABLE history_logs 
            ALTER COLUMN id TYPE BIGINT;
        `

        // 2. Performance: TimescaleDB (Optional)
        console.log('🚀 Attempting to enable TimescaleDB...')
        try {
            // Attempt to create extension (requires superuser or permission)
            await sql`CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;`

            // Convert to hypertable (partition by time)
            // if_not_exists is nice but create_hypertable throws if already hypertable usually
            // We use a safe wrapper or try-catch block for just this part
            await sql`SELECT create_hypertable('history_logs', 'timestamp', if_not_exists => TRUE);`

            console.log('✅ TimescaleDB enabled and hypertable created!')
        } catch (tsError) {
            console.warn('⚠️ TimescaleDB setup failed (likely not installed or no permissions). Skipping TimescaleDB optimization.')
            console.warn('   Error details:', tsError)
            console.log('ℹ️ Proceeding with standard PostgreSQL table (BIGINT fixed).')
        }

        console.log('✅ History Logs Optimization Completed')
    } catch (error) {
        console.error('❌ Optimization Failed:', error)
    } finally {
        process.exit(0)
    }
}

migrate()
