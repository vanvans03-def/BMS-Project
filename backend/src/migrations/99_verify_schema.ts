import { sql } from '../db';

async function checkSchema() {
    try {
        const columns = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'devices' 
            AND column_name IN (
                'connection_type', 
                'tcp_response_timeout', 
                'serial_port_name', 
                'byte_order_float'
            );
        `;

        console.log('Found Columns:', columns.map(c => c.column_name));

        const expected = ['connection_type', 'tcp_response_timeout', 'serial_port_name', 'byte_order_float'];
        const found = columns.map(c => c.column_name);

        const missing = expected.filter(e => !found.includes(e));

        if (missing.length === 0) {
            console.log('✅ All expected columns found.');
        } else {
            console.error('❌ Missing columns:', missing);
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

checkSchema();
