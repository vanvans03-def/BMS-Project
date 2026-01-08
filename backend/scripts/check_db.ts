
import { sql } from '../src/db'

async function run() {
    try {
        const res = await sql`SELECT id, device_name, floor, zone, room FROM devices LIMIT 5`
        console.table(res)
    } catch (err) {
        console.error(err)
    } finally {
        process.exit(0)
    }
}
run()
