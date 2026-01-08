import { sql } from '../src/db'

async function verifyLowCode() {
    console.log('🧪 Verifying Low Code Export View...')

    try {
        console.log('--- VW_LOW_CODE_EXPORT ---')
        const rows = await sql`
            SELECT * FROM vw_low_code_export 
            LIMIT 5
        `
        console.table(rows)

        if (rows.length === 0) console.log('⚠️ No data found in export view.')
        else {
            console.log('✅ Columns found:', Object.keys(rows[0]!).join(', '))
        }

    } catch (err) {
        console.error('❌ Verification Failed:', err)
    } finally {
        process.exit(0)
    }
}

verifyLowCode()
