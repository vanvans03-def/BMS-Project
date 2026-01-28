
import { sql } from './src/db';

async function check() {
    try {
        console.log("--- Locations of type 'Device' ---");
        const locs = await sql`SELECT id, name, type FROM locations WHERE type = 'Device'`;
        console.log(locs);

        if (locs.length > 0) {
            const sampleId = locs[0].id;
            console.log(`\n--- Points for Location ID ${sampleId} ---`);
            const points = await sql`SELECT id, point_name, location_id FROM points WHERE location_id = ${sampleId}`;
            console.log(points);
        } else {
            console.log("No Device locations found.");
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
