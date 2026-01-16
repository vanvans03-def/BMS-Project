import { sql } from '../db';

console.log('Migrating: 17_add_modbus_config.ts');

async function migrate() {
    try {
        console.log('📦 Altering table: devices to add Modbus Configuration columns');

        await sql`
            ALTER TABLE devices
            ADD COLUMN IF NOT EXISTS connection_type VARCHAR(20) DEFAULT 'TCP', -- TCP or SERIAL
            ADD COLUMN IF NOT EXISTS tcp_response_timeout INTEGER DEFAULT 1000,
            
            -- Serial Parameters
            ADD COLUMN IF NOT EXISTS serial_port_name VARCHAR(50),      -- e.g. COM1, /dev/ttyUSB0
            ADD COLUMN IF NOT EXISTS serial_baud_rate INTEGER DEFAULT 9600,
            ADD COLUMN IF NOT EXISTS serial_data_bits INTEGER DEFAULT 8,
            ADD COLUMN IF NOT EXISTS serial_stop_bits INTEGER DEFAULT 1,
            ADD COLUMN IF NOT EXISTS serial_parity VARCHAR(10) DEFAULT 'none',
            
            -- Data Tuning (Endianness)
            ADD COLUMN IF NOT EXISTS byte_order_float VARCHAR(20) DEFAULT 'Order3210', -- Big Endian Default
            ADD COLUMN IF NOT EXISTS byte_order_long VARCHAR(20) DEFAULT 'Order3210';
        `;

        console.log('✅ Migration 17 completed successfully');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
