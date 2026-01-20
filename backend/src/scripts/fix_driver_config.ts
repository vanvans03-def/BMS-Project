
import { sql } from '../db';

console.log('🔄 Running Fix Driver Config Script...');

async function run() {
    try {
        // 1. Find existing BACnet Driver
        const drivers = await sql`
            SELECT id, config FROM devices 
            WHERE device_type = 'DRIVER' AND protocol = 'BACNET_IP'
        `;

        if (drivers.length === 0) {
            console.log('⚠️ No BACnet Driver found to update.');
            // Optional: Create one if needed, but the original migration should have handled it.
        } else {
            for (const driver of drivers) {
                console.log(`Found Driver ID: ${driver.id}`);

                // 2. Prepare new config
                // Ensuring we merge with existing config if possible, or just overwrite transport.
                const currentConfig = driver.config || {};

                const newConfig = {
                    ...currentConfig,
                    transport: {
                        ...currentConfig.transport,
                        // Force Defaults
                        udpPort: "0xBAC0", // 47808
                        interface: "eth0"
                    }
                };

                // 3. Update DB
                await sql`
                    UPDATE devices 
                    SET config = ${sql.json(newConfig)}
                    WHERE id = ${driver.id}
                `;
                console.log(`✅ Updated Driver ${driver.id} -> Port: 0xBAC0 (47808), Interface: eth0`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating driver config:', error);
        process.exit(1);
    }
}

run();
