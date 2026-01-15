import { sql } from '../db';

console.log('Migrating: 15_migrate_modbus_hierarchy.ts');

async function migrate() {
    try {
        // 1. Get all existing Modbus devices (which are currently flat)
        // We look for devices that are MODBUS, are 'DEVICE' (default), and have no parent.
        const devices = await sql`
            SELECT * FROM devices 
            WHERE protocol = 'MODBUS' 
            AND parent_id IS NULL 
            AND (device_type = 'DEVICE' OR device_type IS NULL)
        `;

        if (devices.length === 0) {
            console.log('No Modbus devices to migrate.');
            process.exit(0);
        }

        console.log(`Found ${devices.length} devices to migrate.`);

        // 2. Group by IP address (Network)
        const devicesByIp: { [ip: string]: typeof devices[number][] } = {};
        for (const device of devices) {
            const ip = device.ip_address;
            if (!devicesByIp[ip]) {
                devicesByIp[ip] = [];
            }
            devicesByIp[ip]!.push(device);
        }

        // 3. For each unique IP, create a Gateway and link devices
        for (const ip of Object.keys(devicesByIp)) {
            const group = devicesByIp[ip];
            const firstDevice = group![0];

            // Name the gateway based on the first device or IP
            const gatewayName = `Gateway ${ip}`; // Or maybe derive from firstDevice.device_name? "Gateway for ..."

            console.log(`Creating Gateway: ${gatewayName} (${ip})`);

            // Check if a gateway already exists? (Unlikely given previous query, but good practice)
            // Insert Gateway
            const [gateway] = await sql`
                INSERT INTO devices (
                    device_name, 
                    ip_address, 
                    device_instance_id, 
                    network_number, 
                    protocol, 
                    device_type, 
                    is_active,
                    polling_interval
                ) VALUES (
                    ${gatewayName}, 
                    ${ip}, 
                    ${Math.floor(Math.random() * 1000000)}, 
                    0, 
                    'MODBUS', 
                    'GATEWAY', 
                    true,
                    ${firstDevice!.polling_interval || 3000}
                )
                RETURNING id
            `;

            console.log(`Gateway created with ID: ${gateway!.id}. linking ${group!.length} devices...`);

            // Update children
            for (const device of group!) {
                await sql`
                    UPDATE devices 
                    SET parent_id = ${gateway!.id}, device_type = 'DEVICE'
                    WHERE id = ${device.id}
                `;
            }
        }

        console.log('✅ Migration data completed successfully');
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
