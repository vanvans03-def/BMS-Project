import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load .env file
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '.env')
console.log('Loading .env from:', envPath)
config({ path: envPath })

console.log('DATABASE_URL:', process.env.DATABASE_URL)

import { sql } from './src/db/index.ts'

console.log('✅ DB module loaded')

// Test basic query
try {
  console.log('🚀 Testing connection...')
  const result = await sql`SELECT 1`
  console.log('✅ Query successful:', result)
} catch (error) {
  console.error('❌ Error:', error)
}

process.exit(0)
