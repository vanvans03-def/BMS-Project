// backend/src/setup.ts
import { sql } from './db'

async function setup() {
  console.log('🚀 Starting Database Setup...')

  try {
    // 1. สร้างตาราง Users
    console.log('📦 Creating table: users')
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'Viewer',
        email VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `

    // 2. สร้างตาราง Devices
    console.log('📦 Creating table: devices')
    await sql`
      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        device_name VARCHAR(255) NOT NULL,
        device_instance_id INTEGER UNIQUE NOT NULL,
        ip_address VARCHAR(255),
        network_number INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `

    // 3. สร้างตาราง Points
    console.log('📦 Creating table: points')
    await sql`
      CREATE TABLE IF NOT EXISTS points (
        id SERIAL PRIMARY KEY,
        device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
        object_type VARCHAR(50) NOT NULL,
        object_instance INTEGER NOT NULL,
        point_name VARCHAR(255),
        description TEXT,
        is_monitor BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(device_id, object_type, object_instance)
      );
    `

    // 4. สร้างตาราง Audit Logs
    console.log('📦 Creating table: audit_logs')
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_name VARCHAR(255) NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        target_name VARCHAR(255),
        details TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `

    // 5. สร้างตาราง System Settings
    console.log('📦 Creating table: system_settings')
    await sql`
      CREATE TABLE IF NOT EXISTS system_settings (
        key_name VARCHAR(255) PRIMARY KEY,
        value_text TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `

    // 6. สร้าง User "admin"
    console.log('bs creating admin user...')
    const username = 'admin'
    const password = 'password' // รหัสผ่านเริ่มต้น
    const hashedPassword = await Bun.password.hash(password)

    // ตรวจสอบว่ามี admin อยู่แล้วหรือยัง
    const existing = await sql`SELECT id FROM users WHERE username = ${username}`
    
    if (existing.length === 0) {
      await sql`
        INSERT INTO users (username, password, role, email, is_active)
        VALUES (${username}, ${hashedPassword}, 'Admin', 'admin@example.com', true)
      `
      console.log(`✅ Created user: ${username} / ${password}`)
    } else {
      console.log(`ℹ️ User ${username} already exists.`)
    }

    console.log('🎉 Setup Completed Successfully!')

  } catch (error) {
    console.error('❌ Setup Failed:', error)
  } finally {
    process.exit(0)
  }
}

setup()