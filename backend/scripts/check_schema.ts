import { sql } from './src/db'

async function checkSchema() {
    try {
        console.log('--- DEVICES TABLE ---')
        const deviceCols = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'devices'
        `
        console.log(deviceCols)

        console.log('\n--- POINTS TABLE ---')
        const pointCols = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'points'
        `
        console.log(pointCols)
    } catch (error) {
        console.error('Error checking schema:', error)
    } finally {
        process.exit()
    }
}

checkSchema()
