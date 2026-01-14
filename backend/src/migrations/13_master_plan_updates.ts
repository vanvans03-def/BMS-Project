import { sql } from '../db'

export async function up() {
    console.log('📦 Migration: applying 13_master_plan_updates...')

    try {
        // 1. Create audit_logs table
        // References: "Audit Logs: Manage user edits, write commands"
        // DROP first because setup.ts created it with wrong schema (user_name vs user_id)
        await sql`DROP TABLE IF EXISTS audit_logs`

        await sql`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                action VARCHAR(50) NOT NULL, -- 'LOGIN', 'WRITE_POINT', 'UPDATE_DEVICE', etc.
                target VARCHAR(100), -- 'Device: Modbus-01', 'Point: 101'
                protocol VARCHAR(20), -- 'BACNET', 'MODBUS'
                details JSONB, -- Previous value, New value, etc.
                ip_address VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `
        console.log('✅ Created audit_logs table')

        // 2. Add point_mark to points table
        // References: "2.3 Table points: point_mark"
        await sql`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'points' AND column_name = 'point_mark') THEN
                    ALTER TABLE points ADD COLUMN point_mark VARCHAR(50);
                END IF;
            END
            $$;
        `
        console.log('✅ Added point_mark to points table')

    } catch (error) {
        console.error('❌ Migration 13 Failed:', error)
        throw error
    }
}

export async function down() {
    console.log('📦 Reverting: 13_master_plan_updates...')
    await sql`DROP TABLE IF EXISTS audit_logs`
    await sql`ALTER TABLE points DROP COLUMN IF EXISTS point_mark`
}
