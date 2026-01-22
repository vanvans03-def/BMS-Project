// backend/src/db/index.ts
import { config } from 'dotenv'

// Load .env file if it exists
try {
  config()
} catch {
  // Ignore errors if dotenv is not available or .env doesn't exist
}

import postgres from 'postgres'

// ดึง connection string จาก env
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('❌ Missing DATABASE_URL in .env file')
}

export const sql = postgres(connectionString)