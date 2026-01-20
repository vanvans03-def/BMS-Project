
import { sql } from '../db';

async function fix() {
    try {
        console.log('🔧 Fixing BACnet Driver Configuration...');

        // 1. Get Port from Settings (Best Effort)
        let bacnetPortStr = '0xBAC0';
        try {
            const [setting] = await sql`SELECT bacnet_port FROM settings LIMIT 1`;
            if (setting && setting.bacnet_port) {
                const portInt = parseInt(setting.bacnet_port);
                if (!isNaN(portInt)) {
                    bacnetPortStr = '0x' + portInt.toString(16).toUpperCase();
                }
            }
        } catch (e) {
            console.warn('Could not read settings table, using default port 0xBAC0');
        }

        const defaultConfig = {
            localDeviceId: 1000,
            objectName: "Web_BMS_Server",
            networkNumber: 1,
            transport: {
                interface: "eth0",
                udpPort: bacnetPortStr
            },
            tuning: {
                apduTimeout: 3000,
                retries: 3
            }
        };

        // 2. Update Driver
        // We target the known driver or find it
        const [driver] = await sql`
            UPDATE devices 
            SET config = ${sql.json(defaultConfig)}
            WHERE device_type = 'DRIVER' AND protocol = 'BACNET_IP'
            RETURNING id, config
        `;

        if (driver) {
            console.log(`✅ Updated Driver (ID: ${driver.id}) with config:`, JSON.stringify(driver.config, null, 2));
        } else {
            console.error('❌ Driver not found!');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Fix failed:', error);
        process.exit(1);
    }
}

fix();
