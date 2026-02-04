import { sql } from '../db'

console.log('🚀 Deploy: 23_add_scale_to_points.ts')

async function deploy() {
    try {
        console.log('--- Adding Scale Column to Points Table ---')

        await sql`
        DO $$
        BEGIN
            -- Add scale column if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'points' AND column_name = 'scale') THEN
                ALTER TABLE points ADD COLUMN scale FLOAT DEFAULT 1.0;
            END IF;

            -- Ensure unit column exists (was added in migration 9, but safe to check)
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'points' AND column_name = 'unit') THEN
                ALTER TABLE points ADD COLUMN unit VARCHAR(50);
            END IF;
        END
        $$;
        `

        console.log('✅ Schema updated successfully.')
        process.exit(0)

    } catch (error) {
        console.error('❌ Deployment Failed:', error)
        process.exit(1)
    }
}

deploy()
