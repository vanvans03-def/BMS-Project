
async function verify() {
    console.log('🧪 Verifying Reports API...')

    try {
        const response = await fetch('http://localhost:3000/api/reports/history')
        const json = await response.json()

        console.log('Status:', response.status)
        // console.log('Response:', JSON.stringify(json, null, 2))

        if (json.success && Array.isArray(json.data)) {
            console.log(`✅ API Success! returned ${json.count} rows`)
            // Check first row
            if (json.data.length > 0) {
                console.log('Sample Row:', json.data[0])
                if (json.data[0].floor && json.data[0].zone) {
                    console.log('✅ Structure Valid')
                }
            }
        } else {
            console.error('❌ API Failed:', json)
        }

    } catch (error) {
        // If connection refused, maybe backend not running. 
        // Usually we can't easily auto-start the full backend here if it's complex, 
        // but we can try to rely on previous verification which tested the service directly.
        console.error('❌ Connection Error (Is Backend Running?):', error.message)
    }
}

verify()
