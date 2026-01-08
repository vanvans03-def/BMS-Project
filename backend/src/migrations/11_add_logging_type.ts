
import { sql } from '../db'

export async function up() {
    console.log('📦 Migration: Adding logging_type to devices table...')
    await sql`
        ALTER TABLE devices 
        ADD COLUMN IF NOT EXISTS logging_type VARCHAR(20) DEFAULT 'COV'
    `
    console.log('✅ Migration applied: logging_type added.')
}

export async function down() {
    console.log('📦 Reverting: Removing logging_type from devices...')
    await sql`
        ALTER TABLE devices 
        DROP COLUMN IF EXISTS logging_type
    `
}
