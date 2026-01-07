
const BASE_URL = 'http://localhost:3000';

async function runTest() {
    console.log('🧪 Starting API Verification...');

    try {
        // 1. Login to get token
        console.log('1. Logging in...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'password' })
        });

        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
        }

        const loginData = await loginRes.json() as any;
        const token = loginData.token;
        console.log('✅ Login successful. Token obtained.');

        // 2. Fetch Devices (should work with /devices)
        console.log('2. Fetching /devices...');
        const devRes = await fetch(`${BASE_URL}/devices`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (devRes.ok) {
            console.log('✅ GET /devices: OK');
            const devs = await devRes.json() as any[];
            console.log(`   Found ${devs.length} devices.`);
        } else {
            console.error(`❌ GET /devices Failed: ${devRes.status}`);
            const txt = await devRes.text();
            console.error('   Response:', txt);
        }

        // 3. Fetch History Logs (should work with /api/history-logs)
        console.log('3. Fetching /api/history-logs...');
        const logsRes = await fetch(`${BASE_URL}/api/history-logs?page=1&limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (logsRes.ok) {
            console.log('✅ GET /api/history-logs: OK');
            const data = await logsRes.json() as any;
            console.log('   Pagination:', data.pagination);
        } else {
            console.error(`❌ GET /api/history-logs Failed: ${logsRes.status}`);
            const txt = await logsRes.text();
            console.error('   Response:', txt);
        }

    } catch (err) {
        console.error('❌ Test Error:', err);
    }
}

runTest();
