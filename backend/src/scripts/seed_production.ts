
import { sql } from '../db';

async function seed() {
    console.log('🌱 Starting Production Seed...');

    try {
        // ============================================
        // 1. DROP EXISTING TABLES (Ordering matters)
        // ============================================
        console.log('🗑️ Dropping existing tables...');
        await sql`DROP TABLE IF EXISTS history_logs CASCADE`; // Legacy/Fallback
        await sql`DROP TABLE IF EXISTS audit_logs CASCADE`;
        await sql`DROP TABLE IF EXISTS points CASCADE`;
        await sql`DROP TABLE IF EXISTS devices CASCADE`;
        await sql`DROP TABLE IF EXISTS settings CASCADE`;
        await sql`DROP TABLE IF EXISTS users CASCADE`;
        await sql`DROP TABLE IF EXISTS locations CASCADE`;

        // Note: Dynamic history tables (history_points_XXX) are not dropped here to avoid accidental data loss of massive history, 
        // but for a clean seed you might want to drop them manually or add a loop here.

        // ============================================
        // 2. CREATE TABLES
        // ============================================
        console.log('🏗️ Creating tables...');

        // Users
        await sql`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'viewer',
                is_active BOOLEAN DEFAULT true,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `;

        // Locations (App 4 Hierarchy)
        await sql`
            CREATE TABLE locations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                parent_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
                level INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `;

        // Settings
        await sql`
            CREATE TABLE settings (
                id SERIAL PRIMARY KEY,
                site_name VARCHAR(100) DEFAULT 'My BMS Site',
                polling_interval INTEGER DEFAULT 5000,
                bacnet_port VARCHAR(10) DEFAULT '47808',
                history_retention_days INTEGER DEFAULT 365,
                discovery_timeout INTEGER DEFAULT 3000,
                line_notify_token VARCHAR(100),
                smtp_host VARCHAR(100),
                smtp_port INTEGER,
                smtp_user VARCHAR(100),
                smtp_pass VARCHAR(100),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `;

        // Devices
        await sql`
            CREATE TABLE devices (
                id SERIAL PRIMARY KEY,
                device_name VARCHAR(100) NOT NULL,
                device_instance_id INTEGER,
                ip_address VARCHAR(50),
                network_number INTEGER DEFAULT 0,
                mac_address VARCHAR(50),
                
                -- Protocol & Type
                protocol VARCHAR(50) DEFAULT 'BACNET', -- 'BACNET', 'MODBUS', 'BACNET_IP'
                device_type VARCHAR(50) DEFAULT 'DEVICE', -- 'DEVICE', 'DRIVER'
                
                -- Modbus Specific
                unit_id INTEGER,
                connection_type VARCHAR(20) DEFAULT 'TCP', -- 'TCP', 'SERIAL'
                tcp_response_timeout INTEGER DEFAULT 1000,
                parent_id INTEGER REFERENCES devices(id) ON DELETE CASCADE, -- Gateway Parent
                
                -- Serial Settings
                serial_port_name VARCHAR(50),
                serial_baud_rate INTEGER DEFAULT 9600,
                serial_data_bits INTEGER DEFAULT 8,
                serial_stop_bits INTEGER DEFAULT 1,
                serial_parity VARCHAR(10) DEFAULT 'none',
                
                -- Byte Order
                byte_order_float VARCHAR(20) DEFAULT 'Order3210',
                byte_order_long VARCHAR(20) DEFAULT 'Order3210',

                -- Metadata
                location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
                is_active BOOLEAN DEFAULT true,
                is_history_enabled BOOLEAN DEFAULT false,
                polling_interval INTEGER, -- Override global
                
                -- Configuration (Universal)
                config JSONB DEFAULT '{}'::jsonb,

                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `;

        // Points
        await sql`
            CREATE TABLE points (
                id SERIAL PRIMARY KEY,
                device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
                
                point_name VARCHAR(100) NOT NULL,
                
                -- BACnet
                object_type VARCHAR(50),
                object_instance INTEGER,
                
                -- Modbus
                register_type VARCHAR(50), -- 'HOLDING_REGISTER', etc.
                data_type VARCHAR(50),     -- 'FLOAT32', 'UINT16', etc.
                data_format VARCHAR(50),
                data_length INTEGER,       -- For STRING

                -- Universal
                universal_type VARCHAR(50), -- 'NUMERIC_R', 'BOOLEAN_W', etc. (Migrated)
                config JSONB DEFAULT '{}'::jsonb,

                -- State
                current_value VARCHAR(255), -- Store as string for versatility
                units VARCHAR(20),
                
                is_monitor BOOLEAN DEFAULT true,
                is_history BOOLEAN DEFAULT false,
                
                created_at TIMESTAMP DEFAULT NOW()
            );
        `;

        // Audit Logs
        await sql`
            CREATE TABLE audit_logs (
                id SERIAL PRIMARY KEY,
                user_name VARCHAR(100),
                action_type VARCHAR(50), -- 'WRITE', 'LOGIN', 'SYSTEM'
                target_name VARCHAR(100),
                details TEXT,
                protocol VARCHAR(50),
                ip_address VARCHAR(50),
                status VARCHAR(20) DEFAULT 'SUCCESS',
                created_at TIMESTAMP DEFAULT NOW()
            );
        `;

        // ============================================
        // 3. INSERT INITIAL DATA
        // ============================================
        console.log('💾 Inserting initial data...');

        // 3.1 Admin User
        const hashedPassword = await Bun.password.hash('admin123', {
            algorithm: 'bcrypt',
            cost: 10,
        });

        await sql`
            INSERT INTO users (username, password, role)
            VALUES ('admin', ${hashedPassword}, 'admin');
        `;
        console.log('   -> Admin user created (user: admin, pass: admin123)');

        // 3.2 Default Settings
        await sql`
            INSERT INTO settings (site_name, polling_interval, bacnet_port, discovery_timeout)
            VALUES ('Production Site', 3000, '47808', 3000);
        `;
        console.log('   -> Default settings created');

        // 3.3 BACnet Driver
        const bacnetConfig = {
            localDeviceId: 1000,
            objectName: "Web_BMS_Server",
            networkNumber: 1,
            transport: {
                interface: "eth0",
                udpPort: "0xBAC0"
            },
            tuning: {
                apduTimeout: 3000,
                retries: 3
            }
        };

        await sql`
            INSERT INTO devices (
                device_name, device_instance_id, device_type, protocol, 
                ip_address, network_number, is_active, config
            ) VALUES (
                'BACnet_IP_Driver', 1000, 'DRIVER', 'BACNET_IP',
                '0.0.0.0', 1, true, ${sql.json(bacnetConfig)}
            );
        `;
        console.log('   -> BACnet Driver created');

        console.log('✅ Production Seed Completed Successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Seeeding Failed:', error);
        process.exit(1);
    }
}

seed();
