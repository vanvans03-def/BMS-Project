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
        SELECT id, object_type, object_instance, point_name, register_type, data_type
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
        const ip = device.ip_address
        const unitId = device.unit_id || 1
        const port = 502 // Default Modbus Port

        let client = null
        try {
          // 1. Establish SINGLE connection for the whole batch
          if (ip) {
            client = await modbusService.connect(ip, port, unitId)
          }
        } catch (connErr) {
          console.error(`❌ [Monitor] Failed to connect to ${device.device_name} (${ip})`, connErr)
          // If connection fails, all points fail
          return {
            success: false,
            message: `Connection failed: ${connErr instanceof Error ? connErr.message : 'Unknown'}`,
            values: []
          }
        }

        try {
          // 2. Loop through points using EXISTING connection
          for (const point of points) {
            try {
              let val = null
              // Use the new WithClient methods
              if (client) {
                const registerType = point.register_type
                const address = point.object_instance

                if (registerType === 'COIL') {
                  val = await modbusService.readCoilWithClient(client, address)
                } else if (registerType === 'HOLDING_REGISTER') {
                  val = await modbusService.readHoldingRegisterWithClient(client, address)
                } else if (registerType === 'INPUT_REGISTER') {
                  val = await modbusService.readInputRegisterWithClient(client, address)
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
              console.error(`❌ Error reading point ${point.id}:`, err)
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
          // 3. Close connection ONCE after all points are read
          if (client) {
            client.close()
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