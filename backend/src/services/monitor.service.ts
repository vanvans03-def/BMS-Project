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
      // CASE A: MODBUS
      // -------------------------------------------------------
      if (device.protocol === 'MODBUS') {
        // [FIXED] เปลี่ยนจาก Promise.all เป็น for...of เพื่ออ่านทีละตัว (Sequential)
        // ป้องกัน Error: TransactionTimedOutError จากการรุม connect device
        for (const point of points) {
          try {
            const val = await modbusService.readPointValue(point.id)
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