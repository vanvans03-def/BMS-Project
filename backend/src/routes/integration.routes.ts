
import { Elysia } from 'elysia'
import { sql } from '../db'

const NIAGARA_API_KEY = process.env.NIAGARA_API_KEY

export const integrationRoutes = new Elysia({ prefix: '/integration' })
    .onBeforeHandle(({ request, set }) => {
        const apiKey = request.headers.get('x-api-key')

        if (apiKey !== NIAGARA_API_KEY) {
            set.status = 401
            return { success: false, message: 'Invalid or missing API Key' }
        }
    })

    .get('/niagara/export', async ({ query }) => {
        try {
            const { protocol } = query

            // 1. Fetch devices with optional protocol filter
            // Note: We use ${protocol} directly in the query conditions if it exists
            const devices = await (protocol
                ? sql`
            SELECT 
              id, device_name, device_instance_id, ip_address, 
              network_number, protocol, unit_id, polling_interval
            FROM devices
            WHERE protocol = ${protocol.toUpperCase()}
            ORDER BY id ASC
          `
                : sql`
            SELECT 
              id, device_name, device_instance_id, ip_address, 
              network_number, protocol, unit_id, polling_interval
            FROM devices
            ORDER BY id ASC
          `
            )

            // 2. Fetch all points (we filter them in memory later or we could filter here too)
            // Determining points based on devices found is safer to avoid fetching unnecessary data
            /* 
               However, for simplicity and performance with existing logic, 
               fetching all points is fine if the dataset isn't huge. 
               But cleaner to fetch only relevant points if we really want to optimize.
               Let's stick to the existing pattern of fetching points but maybe filter by device_ids 
               if we wanted to be super efficient. For now, matching the previous logic is safer.
            */
            const points = await sql`
        SELECT 
          id, device_id, point_name, object_type, 
          object_instance, register_type, data_type, data_format
        FROM points
        ORDER BY object_instance ASC
      `

            // 3. Map points to devices
            const devicesWithPoints = devices.map(device => {
                const devicePoints = points.filter(p => p.device_id === device.id).map(p => ({
                    name: p.point_name,
                    address: p.object_instance,
                    objectType: p.object_type,
                    registerType: p.register_type,
                    dataType: p.data_type,
                    dataFormat: p.data_format
                }))

                // Handle IP/Port splitting
                let ip = device.ip_address
                let port = 502 // Default Modbus

                if (device.protocol === 'BACNET') {
                    port = 47808 // Default BACnet
                }

                if (ip && ip.includes(':')) {
                    const parts = ip.split(':')
                    ip = parts[0]
                    port = parseInt(parts[1]) || port
                }

                return {
                    id: device.id,
                    name: device.device_name,
                    instanceId: device.device_instance_id,
                    ip: ip,
                    port: port,
                    protocol: device.protocol,
                    unitId: device.unit_id,
                    networkNumber: device.network_number,
                    points: devicePoints
                }
            })

            return {
                success: true,
                timestamp: new Date().toISOString(),
                total_devices: devicesWithPoints.length,
                devices: devicesWithPoints
            }

        } catch (error) {
            console.error('Niagara Export Error:', error)
            return { success: false, message: 'Internal Server Error' }
        }
    })
