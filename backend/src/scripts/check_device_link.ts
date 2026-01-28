
import { sql } from '../db' // Adjust import if needed

async function checkDevice() {
    try {
        const devices = await sql`
      SELECT d.id, d.device_instance_id, d.device_name, dc.network_config_id
      FROM devices d
      LEFT JOIN device_config dc ON d.id = dc.device_id
      WHERE d.device_instance_id = 1000
    `
        console.log('Device Info:', devices)
    } catch (error) {
        console.error(error)
    } process.exit(0)
}

checkDevice()
