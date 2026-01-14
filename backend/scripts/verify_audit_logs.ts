
const API_URL = 'http://localhost:3000'

async function testAuditLogs() {
    console.log('Testing /audit-logs endpoint...')
    try {
        // Test with default "ALL" protocols logic (BACNET,ALL)
        const params = new URLSearchParams()
        params.append('protocols', 'BACNET,ALL')

        // Login as admin first to get token
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'password123' }) // Assuming generic admin/password or whatever is in seed
        })

        // If login fails, we might need to skip auth or use a known token. 
        // But let's try to assume we can get 401 if not authorized, which is still a valid JSON response usually (success: false).
        // Actually the backend middleware returns 401/403 with JSON.

        let token = ''
        if (loginRes.ok) {
            const loginData = await loginRes.json() as { token: string }
            token = loginData.token
            console.log('Login successful, got token.')
        } else {
            console.log('Login failed (or not needed for test if skipped?), status:', loginRes.status)
        }

        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch(`${API_URL}/audit-logs?${params.toString()}`, {
            headers
        })

        console.log('Status:', res.status)
        const text = await res.text()
        console.log('Raw response:', text.substring(0, 200) + '...')

        try {
            const json = JSON.parse(text)
            console.log('✅ JSON parsed successfully. Is Array?', Array.isArray(json))
            if (Array.isArray(json)) {
                console.log('Log count:', json.length)
            }
        } catch (e) {
            console.error('❌ Failed to parse JSON:', e)
        }

    } catch (error) {
        console.error('Test failed:', error)
    }
}

testAuditLogs()
