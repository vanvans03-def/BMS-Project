import { sql } from '../db'
import { bacnetService } from './bacnet.service'
import type { ReadRequestDto } from '../dtos/bacnet.dto'
import type { MonitorResponse } from '../dtos/monitor.dto'

export const monitorService = {
  /**
   * อ่านค่า Real-time ของ Points ทั้งหมดในอุปกรณ์
   */
  async readDevicePoints(deviceId: number): Promise<MonitorResponse> {
    try {
      // 1. ดึง Device จาก Database
      const [device] = await sql`
        SELECT * FROM devices WHERE id = ${deviceId}
      `

      if (!device) {
        return { success: false, message: 'Device not found', values: [] }
      }

      // 2. ดึง Points ที่ต้องการ Monitor
      const points = await sql`
        SELECT id, object_type, object_instance, point_name
        FROM points 
        WHERE device_id = ${deviceId}
          AND is_monitor = true
          AND object_type != 'OBJECT_DEVICE'
        ORDER BY object_type, object_instance
      `

      if (points.length === 0) {
        return { success: true, values: [] }
      }

      // 3. เตรียม Payload และยิง BACnet
      const readRequests: ReadRequestDto[] = points.map(point => ({
        deviceId: device.device_instance_id,
        objectType: point.object_type,
        instance: point.object_instance,
        propertyId: 'PROP_PRESENT_VALUE'
      }))

      // console.log(`📊 [Monitor] Reading ${readRequests.length} points from device ${device.device_instance_id}`)
      
      const results = await bacnetService.readMultiple(readRequests)

      // 4. Map ผลลัพธ์
      const values = points.map((point, index) => {
        const result = results[index]
        return {
          pointId: point.id,
          pointName: point.point_name,
          objectType: point.object_type,
          instance: point.object_instance,
          value: result?.value ?? null,
          status: result?.status ?? 'error',
          timestamp: new Date().toISOString()
        }
      })

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