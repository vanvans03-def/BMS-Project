
import { sql } from '../src/db'

const DEVICE_ID = 28 // Device-1234
const HOURS_TO_GENERATE = 24

async function seedReportData() {
    console.log(`🌱 Seeding Report Data for Device ${DEVICE_ID}...`)

    try {
        // 1. Get Point ID
        const points = await sql`SELECT id FROM points WHERE device_id = ${DEVICE_ID} LIMIT 1`
        if (points.length === 0) throw new Error('No points found for device')
        const pointId = points[0].id

        // 2. Insert Data for the last 24 hours
        console.log(`   -> Generating ${HOURS_TO_GENERATE} hours of data...`)
        const now = new Date()

        for (let i = 0; i < HOURS_TO_GENERATE; i++) {
            const timestamp = new Date(now)
            timestamp.setHours(timestamp.getHours() - i)

            // Generate a random value between 20 and 30
            const value = 20 + Math.random() * 10

            await sql`
                INSERT INTO history_logs (device_id, point_id, value, timestamp, quality_code)
                VALUES (${DEVICE_ID}, ${pointId}, ${value}, ${timestamp}, 'TEST_SEED')
            `
        }
        console.log('   -> Data inserted.')

        // 3. Refresh View
        console.log('🔄 Refreshing Materialized View...')
        await sql`REFRESH MATERIALIZED VIEW mv_history_hourly`
        console.log('✅ View Refreshed. Data should be visible in Report now.')

    } catch (err) {
        console.error('❌ Seeding Failed:', err)
    } finally {
        process.exit(0)
    }
}

seedReportData()
