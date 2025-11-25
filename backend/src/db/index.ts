// backend/src/db/index.ts
import postgres from 'postgres'

// ดึง connection string จาก env
const connectionString = Bun.env.DATABASE_URL

if (!connectionString) {
  throw new Error('❌ Missing DATABASE_URL in .env file')
}

export const sql = postgres(connectionString)