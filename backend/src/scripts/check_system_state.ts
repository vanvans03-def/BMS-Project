
import { sql } from '../db'

async function checkSystemState() {
    try {
        console.log('=== NETWORKS ===');
        const networks = await sql`SELECT * FROM network_config`;
        console.table(networks);

        console.log('\n=== DEVICES (All) ===');
        const devices = await sql`
      SELECT d.id, d.device_name, d.protocol, dc.network_config_id 
      FROM devices d
      LEFT JOIN device_config dc ON d.id = dc.device_id
    `;
        console.table(devices);

        console.log('\n=== POINTS (All) ===');
        const points = await sql`
      SELECT * FROM points
    `;
        console.table(points);

        if (points.length === 0) {
            console.log("No points found in database.");
        } else {
            console.log(`Found ${points.length} points.`);
            console.log('Sample Point:', points[0]);
        }

    } catch (error) {
        console.error('Error:', error)
    }
}

checkSystemState()
