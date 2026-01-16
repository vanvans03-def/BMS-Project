
import { sql } from '../db'

export async function up() {
    console.log('🔄 Starting Point Display Type Migration (Niagara Style)...')

    try {
        // 1. Add column if not exists
        await sql`
      ALTER TABLE points
      ADD COLUMN IF NOT EXISTS display_type VARCHAR(50);
    `
        console.log('✅ Added display_type column')

        // 2. Backfill Data based on Modbus Register Type
        // Boolean(W) - COIL
        await sql`
      UPDATE points 
      SET display_type = 'Boolean(W)' 
      WHERE register_type = 'COIL'
    `
        console.log('✅ Migrated COIL -> Boolean(W)')

        // Boolean(R) - DISCRETE_INPUT
        await sql`
      UPDATE points 
      SET display_type = 'Boolean(R)' 
      WHERE register_type = 'DISCRETE_INPUT'
    `
        console.log('✅ Migrated DISCRETE_INPUT -> Boolean(R)')

        // Numeric(W) - HOLDING_REGISTER
        // (Assuming Numeric by default unless we have String logic later)
        await sql`
      UPDATE points 
      SET display_type = 'Numeric(W)' 
      WHERE register_type = 'HOLDING_REGISTER'
    `
        console.log('✅ Migrated HOLDING_REGISTER -> Numeric(W)')

        // Numeric(R) - INPUT_REGISTER
        await sql`
      UPDATE points 
      SET display_type = 'Numeric(R)' 
      WHERE register_type = 'INPUT_REGISTER'
    `
        console.log('✅ Migrated INPUT_REGISTER -> Numeric(R)')

        // 3. Backfill Data for BACnet (Best Guess based on existing Object Type)
        // Binary Value/Output -> Boolean(W)
        await sql`
      UPDATE points 
      SET display_type = 'Boolean(W)' 
      WHERE object_type IN ('OBJECT_BINARY_VALUE', 'OBJECT_BINARY_OUTPUT')
    `

        // Binary Input -> Boolean(R)
        await sql`
      UPDATE points 
      SET display_type = 'Boolean(R)' 
      WHERE object_type = 'OBJECT_BINARY_INPUT'
    `

        // Analog Value/Output -> Numeric(W)
        await sql`
      UPDATE points 
      SET display_type = 'Numeric(W)' 
      WHERE object_type IN ('OBJECT_ANALOG_VALUE', 'OBJECT_ANALOG_OUTPUT')
    `

        // Analog Input -> Numeric(R)
        await sql`
      UPDATE points 
      SET display_type = 'Numeric(R)' 
      WHERE object_type = 'OBJECT_ANALOG_INPUT'
    `

        console.log('✅ Migrated BACnet Types')

        // 4. Default Unknowns to Raw or Empty if NULL
        // (Optional: Leave null if not matched)

        console.log('✅ Migration Completed Successfully!')
    } catch (error) {
        console.error('❌ Migration Failed:', error)
    }
}

export async function down() {
    try {
        await sql`ALTER TABLE points DROP COLUMN IF EXISTS display_type`
        console.log('✅ Reverted display_type column')
    } catch (error) {
        console.error('❌ Revert Failed:', error)
    }
}

// Auto-run if executed directly
if (import.meta.main) {
    up().then(() => process.exit(0))
}
