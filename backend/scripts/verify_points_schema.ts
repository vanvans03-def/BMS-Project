import { sql } from '../src/db';

async function verify() {
    console.log('Verifying Points Schema...');

    const columns = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'points';
  `;

    const colNames = columns.map(c => c.column_name);
    console.log('Points Columns:', colNames.join(', '));

    const hasReport = colNames.includes('report_table_name');
    const hasMark = colNames.includes('point_mark');

    console.log(`Has report_table_name: ${hasReport}`);
    console.log(`Has point_mark: ${hasMark}`);

    const historyColumns = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'history_logs';
  `;
    console.log('History Logs Columns:', historyColumns.map(c => c.column_name).join(', '));

    process.exit(0);
}

verify().catch(console.error);
