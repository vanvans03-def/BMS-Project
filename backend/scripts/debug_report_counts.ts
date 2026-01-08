
import { sql } from '../src/db'

async function debugReportCounts() {
    console.log('🔍 Debugging Report Data Volume...')

    try {
        // 1. Count Raw Logs
        const rawCounts = await sql`
            SELECT count(*) as total, count(distinct device_id) as devices 
            FROM history_logs
        `
        console.log(`📊 Raw History Logs (history_logs): ${rawCounts[0].total} rows`)

        // 2. Count Hourly View
        const hourlyCounts = await sql`
            SELECT count(*) as total 
            FROM mv_history_hourly
        `
        console.log(`📊 Hourly Report (mv_history_hourly): ${hourlyCounts[0].total} rows`)

        // 3. Count Export View
        const exportCounts = await sql`
            SELECT count(*) as total 
            FROM vw_low_code_export
        `
        console.log(`📊 Low Code Export (vw_low_code_export): ${exportCounts[0].total} rows`)

        // 4. Calculate expected compression
        // Approx samples per hour = 3600 / 5s = 720 samples/hr
        // Expected Ratio ~ 1:720
        const ratio = parseInt(rawCounts[0].total) / (parseInt(hourlyCounts[0].total) || 1)
        console.log(`📉 Compression Ratio: ~${ratio.toFixed(1)} raw logs per 1 report row`)
        console.log(`   (Ideally should be around 720 if logging every 5s perfectly)`)

        // 5. Check DATE range
        const range = await sql`
            SELECT min(timestamp) as min_ts, max(timestamp) as max_ts
            FROM history_logs
        `
        console.log(`📅 Data Range: ${range[0].min_ts} to ${range[0].max_ts}`)

    } catch (err) {
        console.error('❌ Debug Failed:', err)
    } finally {
        process.exit(0)
    }
}

debugReportCounts()
