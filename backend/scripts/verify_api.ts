
import axios from 'axios'
import { historyReportService } from '../src/services/history-report.service'
import { historyLogRoutes } from '../src/routes/history-logs.routes'
import { Elysia } from 'elysia';

// We can test the router directly without spinning up the full server
// by using Elysia's handle method or just mocking. 
// However, since we used sql calls inside, unit testing the route handler is a bit tricky without mocking/stubbing sql.
// EASIER: Just use the service directly here to confirm it runs SQL properly, 
// OR start a temp server. 

const app = new Elysia()
    .use(historyLogRoutes)

async function testApi() {
    console.log('🧪 Testing Report API...')

    const startDate = '2026-01-01'
    const endDate = '2026-02-01'

    // Mock request
    const req = new Request(`http://localhost/api/history-logs/report/hourly?startDate=${startDate}&endDate=${endDate}`)

    // Dispatch
    const res = await app.handle(req)

    if (res.status === 200) {
        const text = await res.text()
        console.log('RESPONSE:', text)
        try {
            const data = JSON.parse(text)
            console.log('✅ API Success! Rows:', (data as any[]).length)
            if ((data as any[]).length > 0) {
                console.table((data as any[]).slice(0, 3))
            } else {
                console.log('⚠️ No data returned (Expected if DB is empty for this range)')
            }
        } catch (e) {
            console.error('JSON Parse Error:', e)
        }
    } else {
        console.error('❌ API Failed:', res.status, await res.text())
    }

    process.exit(0)
}

testApi()
