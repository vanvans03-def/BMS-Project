import { sql } from '../db';

console.log('🚀 Deploy: 18_deploy_hierarchy_full.ts - Installing Hierarchy & History Sync');

async function deploy() {
    try {
        console.log('--- Step 1: Schema Updates (Migration 14) ---');
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
        console.log('✅ Schema updated.');


        console.log('--- Step 2: Data Migration (Migration 15) ---');
        // Group Devices into Gateways
        const devices = await sql`
            SELECT * FROM devices 
            WHERE protocol = 'MODBUS' 
            AND parent_id IS NULL 
            AND (device_type = 'DEVICE' OR device_type IS NULL)
        `;

        if (devices.length > 0) {
            console.log(`Found ${devices.length} devices to organize.`);
            const devicesByIp: { [ip: string]: typeof devices[number][] } = {};
            for (const device of devices) {
                const ip = device.ip_address;
                if (!devicesByIp[ip]) devicesByIp[ip] = [];
                devicesByIp[ip]!.push(device);
            }

            for (const ip of Object.keys(devicesByIp)) {
                const group = devicesByIp[ip];
                const firstDevice = group![0];
                const gatewayName = `Gateway ${ip}`;

                // Check if gateway exists to avoid duplicates in this script run
                const [existing] = await sql`SELECT id FROM devices WHERE device_name = ${gatewayName} AND device_type = 'GATEWAY' LIMIT 1`;
                let gatewayId = existing?.id;

                if (!gatewayId) {
                    const [gateway] = await sql`
                        INSERT INTO devices (
                            device_name, ip_address, device_instance_id, network_number, 
                            protocol, device_type, is_active, polling_interval
                        ) VALUES (
                            ${gatewayName}, ${ip}, ${Math.floor(Math.random() * 1000000)}, 0, 
                            'MODBUS', 'GATEWAY', true, ${firstDevice!.polling_interval || 3000}
                        )
                        RETURNING id
                    `;
                    gatewayId = gateway!.id;
                    console.log(`Created Gateway: ${gatewayName}`);
                }

                // Update children
                for (const device of group!) {
                    await sql`
                        UPDATE devices 
                        SET parent_id = ${gatewayId}, device_type = 'DEVICE'
                        WHERE id = ${device.id}
                    `;
                }
            }
            console.log('✅ Modbus Hierarchy organized.');
        } else {
            console.log('ℹ️ No unassigned Modbus devices found.');
        }


        console.log('--- Step 3: History Synchronization (Migration 17) ---');
        // Rebuild existing view
        const activePoints = await sql`
            SELECT p.report_table_name, d.device_name, p.point_name
            FROM points p
            JOIN devices d ON p.device_id = d.id
            WHERE p.report_table_name IS NOT NULL
        `;

        if (activePoints.length > 0) {
            const queries = activePoints.map(p => `
                SELECT timestamp, value, quality_code, '${p.device_name}' as device_name, '${p.point_name}' as point_name 
                FROM ${p.report_table_name}
             `);

            await sql.unsafe(`
                CREATE OR REPLACE VIEW vw_low_code_export AS
                ${queries.join(' UNION ALL ')}
             `);
            console.log(`✅ History View synced with ${activePoints.length} tables.`);
        } else {
            console.log('ℹ️ No active history points to sync.');
        }

        console.log('✨ Full Deployment Complete.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Deployment Failed:', error);
        process.exit(1);
    }
}

deploy();
