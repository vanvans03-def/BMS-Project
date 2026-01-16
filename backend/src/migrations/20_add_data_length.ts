
import { sql } from '../db'

export async function up() {
    console.log('🔄 Starting Data Length Migration...')

    try {
        // 1. Add data_length column
        await sql`
      ALTER TABLE points
      ADD COLUMN IF NOT EXISTS data_length INTEGER DEFAULT 1;
    `
        console.log('✅ Added data_length column')

        // 2. Default all existing points to length 1 (16-bit) -> Done by default 1
        // But for FLOAT32/INT32, should it be 2?
        // Let's update known types
        await sql`
      UPDATE points 
      SET data_length = 2 
      WHERE data_type IN ('FLOAT32', 'INT32', 'UINT32')
    `
        console.log('✅ Updated 32-bit types to length 2')

        console.log('✅ Migration Completed Successfully!')
    } catch (error) {
        console.error('❌ Migration Failed:', error)
    }
}

export async function down() {
    try {
        await sql`ALTER TABLE points DROP COLUMN IF EXISTS data_length`
        console.log('✅ Reverted data_length column')
    } catch (error) {
        console.error('❌ Revert Failed:', error)
    }
}

if (import.meta.main) {
    up().then(() => process.exit(0))
}
