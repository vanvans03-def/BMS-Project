import { sql } from '../db';

console.log('Migrating: 6_add_polling_interval.ts');

try {
    // Add polling_interval column if it doesn't exist
    await sql`
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'polling_interval') THEN
            ALTER TABLE devices ADD COLUMN polling_interval INTEGER DEFAULT 60000;
        END IF;
    END
    $$;
    `;
    console.log('✅ Ensure polling_interval column exists');

    process.exit(0);
} catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
}
