import { sql } from '../db'

export async function up() {
    console.log('🔄 Backfilling Modbus Device Defaults...')

    try {
        // 1. Set default Connection Type to TCP for existing Modbus devices if null
        await sql`
      UPDATE devices 
      SET connection_type = 'TCP' 
      WHERE protocol = 'MODBUS' 
      AND connection_type IS NULL
    `

        // 2. Set default TCP Timeout if null
        await sql`
      UPDATE devices 
      SET tcp_response_timeout = 1000 
      WHERE protocol = 'MODBUS' 
      AND tcp_response_timeout IS NULL
    `

        // 3. Set default Byte Order for Floats to Order3210 (Big Endian)
        await sql`
      UPDATE devices 
      SET byte_order_float = 'Order3210' 
      WHERE protocol = 'MODBUS' 
      AND byte_order_float IS NULL
    `

        // 4. Set default Byte Order for Longs to Order3210
        await sql`
      UPDATE devices 
      SET byte_order_long = 'Order3210' 
      WHERE protocol = 'MODBUS' 
      AND byte_order_long IS NULL
    `

        console.log('✅ Modbus Backfill Complete.')
    } catch (error) {
        console.error('❌ Modbus Backfill Failed:', error)
    }
}

export async function down() {
    // No strict rollback needed for default value backfills usually, 
    // but we could set them back to NULL if strictly required.
    console.log('Values intentionally left modified.')
}

// Execute if run directly
if (import.meta.main) {
    up()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err)
            process.exit(1)
        })
}
