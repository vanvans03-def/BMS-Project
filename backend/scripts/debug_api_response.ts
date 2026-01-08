
import { sql } from '../src/db'

// Mocking what the route handler does
async function check() {
    console.log('🔍 Checking DB query result...')
    const tables = await sql`
        SELECT 
            p.report_table_name as table_name,
            d.device_name,
            p.point_name
        FROM points p
        JOIN devices d ON p.device_id = d.id
        WHERE p.report_table_name IS NOT NULL
        ORDER BY d.device_name, p.point_name
    `
    console.log('Type of tables:', typeof tables)
    console.log('Is Array?', Array.isArray(tables))
    console.log('Constructor:', tables.constructor.name)

    const spread = [...tables]
    console.log('Spread Is Array?', Array.isArray(spread))
    console.log('First item:', spread[0])
    console.log('First item stringified:', JSON.stringify(spread[0]))

    process.exit(0)
}

check()
