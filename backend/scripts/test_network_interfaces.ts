/**
 * Test script for network interfaces API
 * Tests the updated endpoint that returns IP addresses
 */

import { settingsService } from '../src/services/settings.service'

async function testNetworkInterfaces() {
  console.log('🧪 Testing Network Interfaces API...\n')

  try {
    const interfaces = await settingsService.getNetworkInterfaces()
    
    console.log('✅ Network Interfaces Retrieved:')
    console.log(JSON.stringify(interfaces, null, 2))
    
    console.log('\n📊 Summary:')
    console.log(`Total interfaces found: ${interfaces.length}`)
    
    interfaces.forEach(iface => {
      console.log(`\n  • ${iface.name}`)
      console.log(`    IP: ${iface.ip}`)
      console.log(`    MAC: ${iface.mac}`)
      console.log(`    Type: ${iface.type}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testNetworkInterfaces()
