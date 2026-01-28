
import { sql } from '../db'
import { configService } from '../services/config.service'

/**
 * Migration Script: Setup Default BACnet Configuration
 * 
 * 1. Creates a default BACnet Network Config (if not exists)
 *    - Interface: 192.168.1.143 (WiFi)
 *    - Port: 47808 (0xBAC0)
 *    - Device ID: 1
 * 2. Links ALL existing devices (that don't have a network config) to this new BACnet network.
 */

async function migrate() {
    console.log('🚀 Starting BACnet Configuration Migration...')

    try {
        // 1. Create Default Network Config
        console.log('📦 finding or creating default BACnet network...')
        const existingNetworks = await configService.getNetworkConfigs('BACNET')

        let bacnetNetworkId: number

        if (existingNetworks.length > 0) {
            console.log(`✅ Found existing BACnet network: ${existingNetworks[0]!.name} (ID: ${existingNetworks[0]!.id})`)
            bacnetNetworkId = existingNetworks[0]!.id
        } else {
            console.log('✨ Creating new default BACnet network...')
            const newNetwork = await configService.createNetworkConfig(
                'Default BACnet Network',
                'BACNET',
                {
                    interface: '192.168.1.143', // Default Requested IP
                    port: 47808,                // Default Port
                    localDeviceId: 1,           // Default Device ID
                    apduTimeout: 3000
                },
                true // Enable by default
            )
            bacnetNetworkId = newNetwork.id
            console.log(`✅ Created BACnet network (ID: ${bacnetNetworkId})`)
        }

        // 2. Link Existing Devices
        console.log('🔗 Linking existing devices...')

        // Get all devices that don't have a config yet (or just force link all)
        // For safety, let's link ALL devices currently in the `devices` table 
        // to this network if they don't have a specific config record.

        // Since we don't have a direct "get all devices" in configService, we'll use raw SQL or just loop
        // Let's assume we want to migrate EVERYTHING.

        const devices = await sql<any[]>`SELECT id, device_name FROM devices`

        let linkedCount = 0

        for (const device of devices) {
            // Check if device already has a config
            const existingConfig = await configService.getDeviceConfig(device.id)

            if (!existingConfig || !existingConfig.network_config_id) {
                await configService.createDeviceConfig(
                    device.id,
                    bacnetNetworkId,
                    existingConfig?.config || {} // Keep existing config if any, mostly empty
                )
                console.log(`   - Linked Device: ${device.device_name} (ID: ${device.id})`)
                linkedCount++
            } else {
                console.log(`   - Skipped Device: ${device.device_name} (ID: ${device.id}) - Already linked to Network ID ${existingConfig.network_config_id}`)
            }
        }

        console.log(`🎉 Migration Completed! Linked ${linkedCount} new devices.`)

    } catch (error) {
        console.error('❌ Migration Failed:', error)
    } finally {
        process.exit(0)
    }
}

migrate()
