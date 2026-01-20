
import { sql } from './db';

async function checkDriver() {
    try {
        const drivers = await sql`SELECT * FROM devices WHERE device_type = 'DRIVER'`;
        console.log('Drivers found:', drivers.length);
        drivers.forEach(d => {
            console.log(`ID: ${d.id}, Protocol: ${d.protocol}, Config:`, JSON.stringify(d.config, null, 2));
        });
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

checkDriver();
