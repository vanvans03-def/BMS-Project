import { sql } from '../src/db'

async function check() {
    const columns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'audit_logs'
    `
    console.log('Audit Logs Columns:', columns)
    process.exit(0)
}

check()
