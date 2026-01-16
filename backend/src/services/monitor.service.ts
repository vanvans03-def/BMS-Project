import { sql } from '../db'
import { bacnetService } from './bacnet.service'
import { modbusService } from './modbus.service'
import type { ReadRequestDto } from '../dtos/bacnet.dto'
import type { MonitorResponse } from '../dtos/monitor.dto'

export const monitorService = {
  async readDevicePoints(deviceId: number): Promise<MonitorResponse> {
    try {
      const [device] = await sql`SELECT * FROM devices WHERE id = ${deviceId}`
      if (!device) return { success: false, message: 'Device not found', values: [] }

      const points = await sql`
        SELECT id, object_type, object_instance, point_name, register_type, data_type, data_length
        FROM points 
        WHERE device_id = ${deviceId}
          AND is_monitor = true
          AND object_type != 'OBJECT_DEVICE'
        ORDER BY object_type, object_instance
      `

      if (points.length === 0) return { success: true, values: [] }

      let values = []

      // -------------------------------------------------------
      // -------------------------------------------------------
      // CASE A: MODBUS
      // -------------------------------------------------------
      if (device.protocol === 'MODBUS') {
        let ip = device.ip_address
        const unitId = device.unit_id || 1
        let port = 502 // Default Modbus Port

        if (ip && ip.includes(':')) {
          const parts = ip.split(':')
          ip = parts[0]
          port = parseInt(parts[1]) || 502
        }

        let client: any = null

        // Helper to connect/reconnect
        const ensureConnected = async () => {
          if (client) return client
          if (!ip) throw new Error('No IP Address')
          try {
            // Reuse the same robust connect logic from modbus.service
            client = await modbusService.connect({
              type: 'TCP',
              ip,
              port,
              timeout: 2000
            }, unitId)
            return client
          } catch (err) {
            console.error(`❌ [Monitor] Connect failed: ${ip}`, err)
            throw err
          }
        }

        try {
          // 2. Loop through points using EXISTING connection (with auto-reconnect)
          for (const point of points) {
            try {
              // Reconnect if needed
              await ensureConnected()

              // Delay to prevent flooding (200ms)
              await new Promise(resolve => setTimeout(resolve, 200))

              let val = null

              if (client) {
                const registerType = point.register_type
                const address = point.object_instance

                if (registerType === 'COIL') {
                  val = await modbusService.readCoilWithClient(client, address)
                } else if (registerType === 'HOLDING_REGISTER') {
                  if (point.data_type === 'STRING') {
                    val = await modbusService.readStringWithClient(client, address, point.data_length || 10, false)
                  } else {
                    val = await modbusService.readHoldingRegisterWithClient(client, address)
                  }
                } else if (registerType === 'INPUT_REGISTER') {
                  if (point.data_type === 'STRING') {
                    val = await modbusService.readStringWithClient(client, address, point.data_length || 10, true)
                  } else {
                    val = await modbusService.readInputRegisterWithClient(client, address)
                  }
                } else if (registerType === 'DISCRETE_INPUT') {
                  val = await modbusService.readDiscreteInputWithClient(client, address)
                }
              }

              values.push({
                pointId: point.id,
                pointName: point.point_name,
                objectType: point.register_type || 'UNKNOWN',
                instance: point.object_instance,
                value: val,
                status: val !== null ? 'ok' : 'error',
                timestamp: new Date().toISOString()
              })

            } catch (err) {
              console.error(`❌ Error reading point ${point.id} (${point.point_name}):`, err)

              // CRITICAL FIX: Close connection on ANY error (Timeout, Data Error, etc.)
              if (client) {
                try { client.close() } catch (e) { }
                client = null
                console.warn(`⚠️ [Monitor] Connection closed due to error. Will reconnect for next point.`)
              }

              values.push({
                pointId: point.id,
                pointName: point.point_name,
                objectType: point.register_type || 'UNKNOWN',
                instance: point.object_instance,
                value: null,
                status: 'error',
                timestamp: new Date().toISOString()
              })
            }
          }
        } finally {
          // Final cleanup
          if (client) {
            try { client.close() } catch (e) { }
          }
        }
      }
      // -------------------------------------------------------
      // CASE B: BACNET
      // -------------------------------------------------------
      else {
        // BACnet มักรองรับ ReadMultipleProperty อยู่แล้ว จึงใช้ logic เดิมได้
        const readRequests: ReadRequestDto[] = points.map(point => ({
          deviceId: device.device_instance_id,
          objectType: point.object_type,
          instance: point.object_instance,
          propertyId: 'PROP_PRESENT_VALUE'
        }))

        const results = await bacnetService.readMultiple(readRequests)

        values = points.map((point, index) => {
          const result = results[index]
          return {
            pointId: point.id,
            pointName: point.point_name,
            objectType: point.object_type,
            instance: point.object_instance,
            value: result?.value ?? null,
            status: result?.status ? 'ok' : 'error',
            timestamp: new Date().toISOString()
          }
        })
      }

      return {
        success: true,
        deviceId,
        deviceInstanceId: device.device_instance_id,
        count: values.length,
        values
      }

    } catch (error) {
      console.error('❌ [Monitor] Read Device failed:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        values: []
      }
    }
  }
}