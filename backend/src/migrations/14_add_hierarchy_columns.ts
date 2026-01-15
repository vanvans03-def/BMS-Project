import { sql } from '../db';

console.log('Migrating: 14_add_hierarchy_columns.ts');

try {
    // Add device_type and parent_id columns
    await sql`
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'device_type') THEN
            ALTER TABLE devices ADD COLUMN device_type VARCHAR(50) DEFAULT 'DEVICE';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'parent_id') THEN
            ALTER TABLE devices ADD COLUMN parent_id INTEGER REFERENCES devices(id) ON DELETE CASCADE;
        END IF;
    END
    $$;
  `;
    console.log('✅ Added hierarchy columns to devices table');

    process.exit(0);

} catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
}
