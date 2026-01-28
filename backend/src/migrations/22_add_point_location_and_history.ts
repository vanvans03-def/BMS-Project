import { sql } from '../db';

console.log('🚀 Deploy: 22_add_point_location_and_history.ts');

async function deploy() {
    try {
        console.log('--- Adding Columns to Points Table ---');

        await sql`
        DO $$
        BEGIN
            -- 1. Link Point to Hierarchy (Location)
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'points' AND column_name = 'location_id') THEN
                ALTER TABLE points ADD COLUMN location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL;
            END IF;

            -- 2. Granular History Control
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'points' AND column_name = 'is_history_enabled') THEN
                ALTER TABLE points ADD COLUMN is_history_enabled BOOLEAN DEFAULT FALSE;
            END IF;
        END
        $$;
        `;

        console.log('✅ Schema updated successfully.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Deployment Failed:', error);
        process.exit(1);
    }
}

deploy();
