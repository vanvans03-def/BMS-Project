
import { sql } from '../src/db'

async function verify() {
    console.log('🧪 Verifying Reporting Views...')

    try {
        console.log('--- VW_DEVICE_CONFIGURATION ---')
        const configs = await sql`
            SELECT * FROM vw_device_configuration 
            LIMIT 5
        `
        console.table(configs)

        console.log('--- MV_HISTORY_HOURLY ---')
        const history = await sql`
            SELECT * FROM mv_history_hourly 
            LIMIT 5
        `
        console.table(history)

        if (configs.length === 0) console.log('⚠️ No device configurations found (Do you have locations in DB?)')
        if (history.length === 0) console.log('⚠️ No history metrics found (Do you have history logs?)')

    } catch (err) {
        console.error('❌ Verification Failed:', err)
    } finally {
        process.exit(0)
    }
}

verify()
