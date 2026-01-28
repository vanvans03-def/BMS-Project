
import { sql } from '../db' // Adjust import if needed

async function checkDevices() {
    try {
        const devices = await sql`SELECT * FROM devices`;
        console.log('All Devices:', JSON.stringify(devices, null, 2));

        const deviceConfigs = await sql`SELECT * FROM device_config`;
        console.log('Device Configs:', JSON.stringify(deviceConfigs, null, 2));

        // Check specific missing device if known, or just dump meaningful info
        const fullInfo = await sql`
      SELECT d.id AS device_id, d.device_name, dc.network_config_id 
      FROM devices d
      LEFT JOIN device_config dc ON d.id = dc.device_id
    `
        console.log('Linked Devices:', JSON.stringify(fullInfo, null, 2));

    } catch (error) {
        console.error('Error:', error)
    }
}

checkDevices()
