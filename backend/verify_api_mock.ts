import { Elysia } from 'elysia'
import { reportsRoutes } from './src/routes/reports.routes'

async function verify() {
    console.log('🧪 Verifying Reports API (Mock Server)...')

    // Create a test app instance
    const app = new Elysia()
        .use(reportsRoutes)

    try {
        // Simulate Request
        const response = await app.handle(
            new Request('http://localhost/api/reports/history?start=2025-01-01&end=2026-12-31')
        )
        const json = await response.json()

        console.log('Status:', response.status)

        if (json.success && Array.isArray(json.data)) {
            console.log(`✅ API Success! returned ${json.count} rows`)
            // Check first row (from previous dummy data insertion if still there, or might be empty if cleanup ran)
            // If cleanup ran, we expect 0, but success.
            // If verification script 1 ran before, we might have data or not.

            console.log('Result count:', json.data.length);

        } else {
            console.error('❌ API Failed:', json)
        }

    } catch (error) {
        console.error('❌ Error:', error)
    }
}

verify()
