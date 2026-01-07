import { sql } from './src/db';

async function verify() {
  console.log('Verifying App 4 Schema...');

  // 1. Check locations table
  const locationsTable = await sql`
    SELECT count(*) FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'locations';
  `;
  console.log(`✅ Locations Table Exists: ${(locationsTable[0]?.count ?? 0) > 0}`);

  // 2. Check devices columns
  const devicesColumns = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'devices' 
    AND column_name IN ('location_id', 'is_history_enabled');
  `;
  const foundCols = devicesColumns.map(c => c.column_name);
  console.log(`✅ Devices Table New Columns: ${foundCols.length}/2 Found (${foundCols.join(', ')})`);

  process.exit(0);
}

verify().catch(console.error);
