import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load .env file
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '.env')
config({ path: envPath })

console.log('DATABASE_URL:', process.env.DATABASE_URL)

import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('❌ Missing DATABASE_URL in .env file')
}

const sql = postgres(connectionString)

try {
  const result = await sql`SELECT 1 as test`
  console.log('✅ Connection successful:', result)
  process.exit(0)
} catch (error) {
  console.error('❌ Connection failed:', error)
  process.exit(1)
}
