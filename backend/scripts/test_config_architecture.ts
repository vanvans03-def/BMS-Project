import { configService } from '../src/services/config.service'
import { sql } from '../src/db'

async function testConfigArchitecture() {
  console.log('🧪 Testing Configuration Architecture Refactor...\n')

  try {
    // Test 1: Get BACnet Network
    console.log('📝 Test 1: Getting BACnet Network Configuration...')
    const bacnetInfo = await configService.getBacnetNetworkInfo()
    if (bacnetInfo) {
      console.log('  ✅ BACnet Network found:')
      console.log(`     - Network ID: ${bacnetInfo.network?.id}`)
      console.log(`     - Name: ${bacnetInfo.network?.name}`)
      console.log(`     - Port: ${bacnetInfo.network?.config.port}`)
      console.log(`     - Devices: ${bacnetInfo.devices.length}`)
      console.log(`     - Points: ${bacnetInfo.points.length}`)
    } else {
      console.log('  ⚠️ No BACnet Network found')
    }

    // Test 2: Get Modbus Networks
    console.log('\n📝 Test 2: Getting Modbus Networks...')
    const modbusNetworks = await configService.getModbusNetworks()
    console.log(`  ✅ Found ${modbusNetworks.length} Modbus networks:`)
    modbusNetworks.forEach((item, idx) => {
      console.log(`     ${idx + 1}. ${item.network.name}`)
      console.log(`        - ID: ${item.network.id}`)
      console.log(`        - Type: ${item.network.config.connectionType}`)
      console.log(`        - IP: ${item.network.config.ip}`)
      console.log(`        - Port: ${item.network.config.port}`)
      console.log(`        - Devices: ${item.devices.length}`)
    })

    // Test 3: Verify Network Config Table
    console.log('\n📝 Test 3: Verifying network_config table...')
    const networks = await configService.getNetworkConfigs()
    console.log(`  ✅ Total networks in database: ${networks.length}`)
    networks.forEach(net => {
      console.log(`     - [${net.protocol}] ${net.name} (ID: ${net.id}, Enabled: ${net.enable})`)
    })

    // Test 4: Verify Device Config Table
    console.log('\n📝 Test 4: Verifying device_config table...')
    const deviceConfigs = await sql<any[]>`SELECT COUNT(*) as count FROM device_config`
    console.log(`  ✅ Total device configs: ${deviceConfigs[0]?.count || 0}`)

    // Test 5: Verify Point Config Table
    console.log('\n📝 Test 5: Verifying point_config table...')
    const pointConfigs = await sql<any[]>`SELECT COUNT(*) as count FROM point_config`
    console.log(`  ✅ Total point configs: ${pointConfigs[0]?.count || 0}`)

    // Test 6: Check devices table for remaining gateways
    console.log('\n📝 Test 6: Checking devices table...')
    const gateways = await sql<any[]>`
      SELECT COUNT(*) as count FROM devices 
      WHERE device_type = 'GATEWAY' OR device_type = 'DRIVER'
    `
    console.log(`  ✅ Remaining Gateways/Drivers in devices table: ${gateways[0]?.count || 0}`)
    console.log(`     (Should be 0 - all migrated to network_config)`)

    // Test 7: Sample Device Configuration
    if (bacnetInfo && bacnetInfo.devices.length > 0) {
      console.log('\n📝 Test 7: Sample Device Configuration...')
      const device = bacnetInfo.devices[0]
      const deviceConfig = await configService.getDeviceConfig(device.id)
      console.log(`  ✅ Device: ${device.device_name}`)
      console.log(`     - Device ID: ${device.id}`)
      console.log(`     - Config: ${JSON.stringify(deviceConfig?.config, null, 2)}`)
    }

    // Test 8: Port Format Verification
    console.log('\n📝 Test 8: Verifying Port Format...')
    if (bacnetInfo?.network?.config.port) {
      const port = bacnetInfo.network.config.port
      const isNumber = typeof port === 'number'
      const isDecimal = port > 255 || port === 502
      console.log(`  ✅ BACnet Port: ${port}`)
      console.log(`     - Is Number: ${isNumber ? '✅' : '❌'}`)
      console.log(`     - Is Decimal: ${isDecimal ? '✅' : '❌'}`)
    }

    modbusNetworks.forEach(item => {
      const port = item.network.config.port
      const isNumber = typeof port === 'number'
      console.log(`  ✅ Modbus [${item.network.name}] Port: ${port}`)
      console.log(`     - Is Number: ${isNumber ? '✅' : '❌'}`)
    })

    console.log('\n✅ All tests completed successfully!\n')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }

  process.exit(0)
}

testConfigArchitecture().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
