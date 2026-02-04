import { sql } from '../db';

console.log('Migrating: 24_add_point_polling.ts');

try {
    // Add columns if they don't exist
    await sql`
    DO $$
    BEGIN
        -- Add poll_mode
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'points' AND column_name = 'poll_mode') THEN
            ALTER TABLE points ADD COLUMN poll_mode VARCHAR(20) DEFAULT 'POLL'; -- 'POLL' or 'COV'
        END IF;

        -- Add poll_interval
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'points' AND column_name = 'poll_interval') THEN
            ALTER TABLE points ADD COLUMN poll_interval INTEGER DEFAULT NULL; -- Null = Use Device Default
        END IF;

        -- Add cov_tolerance
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'points' AND column_name = 'cov_tolerance') THEN
            ALTER TABLE points ADD COLUMN cov_tolerance FLOAT DEFAULT NULL; -- Null = No tolerance / Exact match
        END IF;
    END
    $$;
    `;
    console.log('✅ Added poll_mode, poll_interval, cov_tolerance to points');

    process.exit(0);
} catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
}
