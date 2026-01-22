import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load .env file
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '../../../.env')
config({ path: envPath })

import { sql } from '../db'

export async function up() {
  console.log('🚀 Starting migration...')
  // 1. Create New Tables
  console.log('📋 Creating network_config table...')
  await sql`
    CREATE TABLE IF NOT EXISTS network_config (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      protocol VARCHAR(50) NOT NULL, -- BACNET, MODBUS
      enable BOOLEAN DEFAULT TRUE,
      config JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `

  console.log('📋 Creating device_config table...')
  await sql`
    CREATE TABLE IF NOT EXISTS device_config (
      id SERIAL PRIMARY KEY,
      device_id INT UNIQUE REFERENCES devices(id) ON DELETE CASCADE,
      network_config_id INT REFERENCES network_config(id) ON DELETE SET NULL,
      config JSONB DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `

  console.log('📋 Creating point_config table...')
  await sql`
    CREATE TABLE IF NOT EXISTS point_config (
      id SERIAL PRIMARY KEY,
      point_id INT UNIQUE REFERENCES points(id) ON DELETE CASCADE,
      config JSONB DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `

  // 2. Data Migration

  // 2a. BACNET: Migrate Driver to Network Config
  console.log('🔍 Migrating BACnet drivers...')
  const bacnetDrivers = await sql`
      SELECT * FROM devices 
      WHERE (protocol = 'BACNET_IP' OR protocol = 'BACNET') 
      AND device_type = 'DRIVER'
  `

  let bacnetNetworkId = null

  if (bacnetDrivers.length > 0) {
    const driver = bacnetDrivers[0]
    
    // Extract config from driver carefully
    const driverConfig = driver?.config || {}
    const driverIp = driver?.ip_address || '0.0.0.0'
    const driverPort = driver?.polling_interval || 47808
    
    // Build network config from driver settings
    const networkConfig = {
      interface: driverConfig?.transport?.interface || 'eth0',
      port: driverConfig?.transport?.udpPort || driverPort || 47808,
      localDeviceId: driverConfig?.localDeviceId || 389001,
      apduTimeout: driverConfig?.apduTimeout || 3000
    }

    console.log(`   📝 BACnet Network Config:`, networkConfig)

    const [newNetResult] = await sql<{ id: number }[]>`
        INSERT INTO network_config (name, protocol, config, enable)
        VALUES ('BACnet Network', 'BACNET', ${JSON.stringify(networkConfig)}, true)
        RETURNING id
      `
    bacnetNetworkId = newNetResult!.id
    console.log(`   ✅ Created network_config id: ${bacnetNetworkId}`)

    // Delete old driver
    await sql`DELETE FROM devices WHERE id = ${driver!.id}`
    console.log(`   🗑️ Deleted BACnet driver device`)
  } else {
    // Create Default if none
    const defaultConfig = {
      interface: 'eth0',
      port: 47808,
      localDeviceId: 389001,
      apduTimeout: 3000
    }
    
    const [newNetResult] = await sql<{ id: number }[]>`
        INSERT INTO network_config (name, protocol, config, enable)
        VALUES ('BACnet Network', 'BACNET', ${JSON.stringify(defaultConfig)}, true)
        RETURNING id
      `
    bacnetNetworkId = newNetResult!.id
    console.log(`   ✅ Created default BACnet network_config id: ${bacnetNetworkId}`)
  }

  // Link existing BACnet devices to this network
  const bacnetDevices = await sql`
    SELECT * FROM devices 
    WHERE (protocol = 'BACNET_IP' OR protocol = 'BACNET')
    AND device_type = 'DEVICE'
  `
  console.log(`   🔗 Linking ${bacnetDevices.length} BACnet devices to network...`)
  
  for (const dev of bacnetDevices) {
    const deviceConfig = {
      instanceId: dev.device_instance_id,
      ...(dev.config || {})
    }
    
    await sql`
        INSERT INTO device_config (device_id, network_config_id, config)
        VALUES (${dev!.id}, ${bacnetNetworkId}, ${deviceConfig})
        ON CONFLICT (device_id) DO NOTHING
     `
  }
  console.log(`   ✅ BACnet devices linked`)

  // 2b. MODBUS: Migrate Gateways to Network Config
  console.log('🔍 Migrating Modbus gateways...')

  const modbusGateways = await sql`
    SELECT * FROM devices 
    WHERE protocol = 'MODBUS' 
    AND (device_type = 'GATEWAY' OR device_type = 'DRIVER' OR parent_id IS NULL)
    ORDER BY id
  `

  console.log(`   Found ${modbusGateways.length} Modbus gateways/drivers`)

  for (const gw of modbusGateways) {
    if (gw.device_type === 'DRIVER') {
      console.log(`   🗑️ Deleting Modbus driver: ${gw.device_name}`)
      await sql`DELETE FROM devices WHERE id = ${gw.id}`
      continue
    }

    // It's a Gateway
    const connectionType = gw.connection_type || 'TCP'
    const config: any = {
      connectionType: connectionType,
      pollingInterval: gw.polling_interval || 100,
      timeout: gw.tcp_response_timeout || 1000,
      deviceName: gw.device_name
    }

    if (connectionType === 'TCP') {
      // Parse IP/Port from ip_address
      const fullIp = gw.ip_address || '127.0.0.1'
      const [ip, portStr] = fullIp.split(':')
      config.ip = ip || '127.0.0.1'
      config.port = parseInt(portStr || '502', 10) || 502
    } else if (connectionType === 'SERIAL') {
      config.serialPort = gw.serial_port_name || 'COM1'
      config.baudRate = gw.serial_baud_rate || 9600
      config.dataBits = gw.serial_data_bits || 8
      config.stopBits = gw.serial_stop_bits || 1
      config.parity = gw.serial_parity || 'none'
    }

    console.log(`   📝 Modbus Gateway '${gw.device_name}' config:`, config)

    const [newNetResult] = await sql`
        INSERT INTO network_config (name, protocol, config, enable)
        VALUES (${gw.device_name}, 'MODBUS', ${config}, true)
        RETURNING id
      `
    const netId = newNetResult!.id
    console.log(`   ✅ Created network_config id: ${netId}`)

    // Now find children devices
    const children = await sql`SELECT * FROM devices WHERE parent_id = ${gw.id}`
    console.log(`   🔗 Linking ${children.length} child devices...`)
    
    for (const child of children) {
      const childConfig = {
        unitId: child.unit_id || 1,
        byteOrderFloat: child.byte_order_float || 'Order3210',
        byteOrderLong: child.byte_order_long || 'Order3210',
        ...(child.config || {})
      }
      
      await sql`
            INSERT INTO device_config (device_id, network_config_id, config)
            VALUES (${child.id}, ${netId}, ${childConfig})
            ON CONFLICT (device_id) DO NOTHING
         `
    }

    // Remove gateway from parent_id references
    await sql`UPDATE devices SET parent_id = NULL WHERE parent_id = ${gw.id}`
    
    // Delete the Gateway device from devices table
    await sql`DELETE FROM devices WHERE id = ${gw.id}`
    console.log(`   ✅ Gateway migrated and removed from devices table`)
  }

  // 3. Migrate Point Config
  console.log('📝 Migrating point configs...')
  const allPoints = await sql`SELECT * FROM points`
  
  for (const p of allPoints) {
    const pointConfig = {
      ...(p.config || {}),
      objectType: p.object_type,
      objectInstance: p.object_instance,
      registerType: p.register_type,
      dataType: p.data_type,
      dataFormat: p.data_format
    }
    
    await sql`
        INSERT INTO point_config (point_id, config)
        VALUES (${p.id}, ${pointConfig})
        ON CONFLICT (point_id) DO UPDATE SET config = EXCLUDED.config
     `
  }
  console.log(`   ✅ ${allPoints.length} point configs migrated`)
  console.log('✅ All migrations completed successfully')
}

export async function down() {
  await sql`DROP TABLE IF EXISTS point_config`
  await sql`DROP TABLE IF EXISTS device_config`
  await sql`DROP TABLE IF EXISTS network_config`
}

// Execute migration when run as a script
const isMainModule = process.argv[1]?.includes('20_refactor_config_arch')
if (isMainModule) {
  console.log('📝 Executing migration as main module...')
  up()
    .then(async () => {
      console.log('✅ Migration UP completed successfully')
      await sql.end()
      process.exit(0)
    })
    .catch(async (error) => {
      console.error('❌ Migration UP failed:', error)
      await sql.end()
      process.exit(1)
    })
}
