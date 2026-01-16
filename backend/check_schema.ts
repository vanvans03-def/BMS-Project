import { sql } from './src/db'

async function checkSchema() {
    try {
        const columns = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'audit_logs'
        `
        console.log('Columns in audit_logs:', columns)
    } catch (error) {
        console.error('Error checking schema:', error)
    } finally {
        process.exit()
    }
}

checkSchema()
