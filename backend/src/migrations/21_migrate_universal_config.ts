import { sql } from '../db';

console.log('Migrating: 21_migrate_universal_config.ts');

async function migrate() {
    try {
        // 1. Add 'config' column to devices if not exists
        await sql`
            ALTER TABLE devices 
            ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;
        `;
        console.log('✅ Added config column to devices');

        // 2. Add 'config' and 'universal_type' to points if not exists
        await sql`
            ALTER TABLE points
            ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb,
            ADD COLUMN IF NOT EXISTS universal_type VARCHAR(50);
        `;
        console.log('✅ Added config and universal_type columns to points');

        // 3. Create BACnet Driver (if not exists)
        // Check for existing settings to get port
        let bacnetPortStr = '0xBAC0';
        try {
            const [setting] = await sql`SELECT bacnet_port FROM settings LIMIT 1`;
            if (setting && setting.bacnet_port) {
                // Convert integer port to HEX string if needed, or just use default if complex
                // But spec says input is HEX String "0xBAC0". 
                // Database likely stores it as integer.
                // If it's 47808 -> 0xBAC0
                const portInt = parseInt(setting.bacnet_port);
                if (!isNaN(portInt)) {
                    bacnetPortStr = '0x' + portInt.toString(16).toUpperCase();
                }
            }
        } catch (e) {
            console.warn('Could not read settings table, using default port 0xBAC0');
        }

        const driverConfig = {
            localDeviceId: 1000,
            objectName: "Web_BMS_Server",
            networkNumber: 1,
            transport: {
                interface: "eth0", // Default, might need adjustment based on env
                udpPort: bacnetPortStr
            },
            tuning: {
                apduTimeout: 3000,
                retries: 3
            }
        };

        // UPSSERT Driver
        // We look for a device with specific properties or just create one.
        // Let's check by name or creating a unique ID for driver? 
        // For now, let's look for device_type='DRIVER' and protocol='BACNET_IP'
        const existingDriver = await sql`
            SELECT id FROM devices 
            WHERE device_type = 'DRIVER' AND protocol = 'BACNET_IP' 
            LIMIT 1
        `;

        let driverId: number;

        if (existingDriver.length > 0) {
            driverId = existingDriver[0]!.id;
            console.log(`ℹ️ BACnet Driver exists (ID: ${driverId})`);
        } else {
            const [newDriver] = await sql`
                INSERT INTO devices (
                    device_name, device_instance_id, device_type, protocol, 
                    ip_address, network_number, is_active, config
                ) VALUES (
                    'BACnet_IP_Driver', 1000, 'DRIVER', 'BACNET_IP',
                    '0.0.0.0', 1, true, ${sql.json(driverConfig)}
                ) RETURNING id
            `;
            driverId = newDriver!.id;
            console.log(`✅ Created BACnet Driver (ID: ${driverId})`);
        }

        // 4. Migrate Existing Devices
        const devices = await sql`
            SELECT id, device_instance_id, ip_address, network_number, polling_interval 
            FROM devices 
            WHERE (device_type IS NULL OR device_type = 'DEVICE')
              AND (protocol = 'BACNET' OR protocol IS NULL)
        `;

        for (const dev of devices) {
            const devConfig = {
                deviceId: dev.device_instance_id,
                address: dev.ip_address || '', // Should ideally have IP
                communication: {
                    segmentation: "SegmentedBoth",
                    maxApduLength: 1476,
                    useCov: true
                },
                ping: {
                    method: "ReadProperty",
                    frequency: dev.polling_interval || 5000
                }
            };

            await sql`
                UPDATE devices 
                SET 
                    parent_id = ${driverId},
                    device_type = 'DEVICE',
                    protocol = 'BACNET', 
                    config = ${sql.json(devConfig)}
                WHERE id = ${dev.id}
            `;
        }
        console.log(`✅ Migrated ${devices.length} BACnet devices`);

        // 5. Migrate Existing Points
        // We only migrate points belonging to these devices
        // Mapping Logic:
        // BUILT-IN BACnet types mapping to Universal

        const points = await sql`
            SELECT p.id, p.object_type, p.object_instance, p.data_type
            FROM points p
            JOIN devices d ON p.device_id = d.id
            WHERE d.protocol = 'BACNET'
        `;

        let updatedPoints = 0;
        for (const p of points) {
            let universalType = 'NUMERIC_R'; // Default
            const typeLower = (p.object_type || '').toLowerCase();
            const typeUpper = (p.object_type || '').toUpperCase();

            // Determine Universal Type
            if (typeLower.includes('binary') || typeLower.includes('digital')) {
                if (typeLower.includes('input')) universalType = 'BOOLEAN_R';
                else universalType = 'BOOLEAN_W'; // Output or Value
            } else if (typeLower.includes('analog') || typeLower.includes('multistate')) {
                if (typeLower.includes('input')) universalType = 'NUMERIC_R';
                else universalType = 'NUMERIC_W';
            } else if (typeLower.includes('accumulator') || typeLower.includes('loop')) {
                universalType = 'NUMERIC_R';
            } else if (typeLower.includes('string')) {
                universalType = 'STRING';
            }

            // Construct Config
            const pointConfig = {
                pollFrequency: "Normal",
                bacnet: {
                    objectType: p.object_type, // Maintain original String format
                    instanceNumber: p.object_instance
                }
            };

            await sql`
                UPDATE points
                SET 
                    universal_type = ${universalType},
                    config = ${sql.json(pointConfig)}
                WHERE id = ${p.id}
            `;
            updatedPoints++;
        }
        console.log(`✅ Migrated ${updatedPoints} points`);

        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
