import { sql } from '../db'
import { bacnetService } from './bacnet.service'
import { modbusService } from './modbus.service' // [Import ใหม่]
import type { ReadRequestDto } from '../dtos/bacnet.dto'
import type { MonitorResponse } from '../dtos/monitor.dto'

export const monitorService = {
  /**
   * อ่านค่า Real-time ของ Points ทั้งหมดในอุปกรณ์
   */
  async readDevicePoints(deviceId: number): Promise<MonitorResponse> {
    try {
      // 1. ดึง Device จาก Database พร้อม Protocol
      const [device] = await sql`
        SELECT * FROM devices WHERE id = ${deviceId}
      `

      if (!device) {
        return { success: false, message: 'Device not found', values: [] }
      }

      // 2. ดึง Points ที่ต้องการ Monitor
      const points = await sql`
        SELECT id, object_type, object_instance, point_name, register_type, data_type
        FROM points 
        WHERE device_id = ${deviceId}
          AND is_monitor = true
          AND object_type != 'OBJECT_DEVICE'
        ORDER BY object_type, object_instance
      `

      if (points.length === 0) {
        return { success: true, values: [] }
      }

      let values = []

      // -------------------------------------------------------
      // CASE A: MODBUS
      // -------------------------------------------------------
      if (device.protocol === 'MODBUS') {
        // วนลูปอ่านค่าทีละ Point (หรือจะปรับเป็น Read Multiple ทีหลังก็ได้)
        const promises = points.map(async (point) => {
            try {
                // เรียก modbusService ที่เตรียมไว้
                const val = await modbusService.readPointValue(point.id)
                return {
                    pointId: point.id,
                    pointName: point.point_name,
                    objectType: point.register_type || 'UNKNOWN',
                    instance: point.object_instance,
                    value: val,
                    status: val !== null ? 'ok' : 'error',
                    timestamp: new Date().toISOString()
                }
            } catch (err) {
                return {
                    pointId: point.id,
                    pointName: point.point_name,
                    objectType: point.register_type || 'UNKNOWN',
                    instance: point.object_instance,
                    value: null,
                    status: 'error',
                    timestamp: new Date().toISOString()
                }
            }
        })
        values = await Promise.all(promises)
      } 
      // -------------------------------------------------------
      // CASE B: BACNET (Logic เดิม)
      // -------------------------------------------------------
      else {
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