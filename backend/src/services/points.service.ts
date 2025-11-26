import { sql } from '../db'
import { bacnetService } from './bacnet.service'
import { auditLogService } from './audit-log.service'
import type { Point, Device, SyncPointsResult } from '../dtos/points.dto'
import type { WriteRequestDto } from '../dtos/bacnet.dto'

class PointsService {
  
  /**
   * ดึง Points ทั้งหมดของ Device จาก Database
   */
  async getPointsByDeviceId(deviceId: number): Promise<Point[]> {
    const result = await sql`
      SELECT 
        id,
        device_id,
        object_type,
        object_instance,
        point_name,
        description,
        is_monitor,
        created_at
      FROM points 
      WHERE device_id = ${deviceId} 
      ORDER BY object_type, object_instance
    `
    
    return Array.from(result) as Point[]
  }

  /**
   * Sync Points จากอุปกรณ์จริง (ผ่าน C# API) ลง Database
   */
  async syncPointsFromDevice(deviceId: number): Promise<SyncPointsResult> {
    try {
      // 1. หา Device จาก Database
      const device = await this.getDeviceById(deviceId)
      
      if (!device) {
        throw new Error('Device not found')
      }

      console.log(`🔄 [PointsService] Syncing points for device: ${device.device_name} (Instance ID: ${device.device_instance_id})`)

      // 2. เรียก BACnet API เพื่อดึง Object List จากอุปกรณ์
      const objects = await bacnetService.getObjects(device.device_instance_id)

      if (objects.length === 0) {
        return { success: false, message: 'No objects found on device' }
      }

      // 3. ลบข้อมูลเก่าออกก่อน (Full Sync Strategy)
      await sql`DELETE FROM points WHERE device_id = ${deviceId}`

      // 4. เตรียมข้อมูล Points ใหม่
      const pointsToInsert = objects.map(obj => ({
        device_id: deviceId,
        object_type: obj.objectType,
        object_instance: obj.instance,
        point_name: `${obj.objectType}_${obj.instance}`,
        description: null,
        is_monitor: true
      }))

      // 5. Insert Points ใหม่ทั้งหมด
      const result = await sql`
        INSERT INTO points ${sql(pointsToInsert)}
        RETURNING *
      `

      const points = Array.from(result) as Point[]

      return { success: true, count: points.length, points }

    } catch (error) {
      console.error('❌ [PointsService] Sync failed:', error)
      throw error
    }
  }

  /**
   * สั่งเขียนค่าลง Point (Write Value)
   */
  async writePointValue(deviceId: number, pointId: number, value: any, priority?: number, userName: string = 'System') {
    // 1. หา Device
    const device = await this.getDeviceById(deviceId)
    if (!device) throw new Error('Device not found')

    // 2. หา Point
    const [point] = await sql`SELECT object_type, object_instance, point_name FROM points WHERE id = ${pointId}`
    if (!point) throw new Error('Point not found in database')

    // 3. ส่งคำสั่ง BACnet
    const bacnetRequest: WriteRequestDto = {
        deviceId: device.device_instance_id,
        objectType: point.object_type,
        instance: point.object_instance,
        propertyId: 'PROP_PRESENT_VALUE',
        value: value,
        priority: priority
    }

    const success = await bacnetService.writeProperty(bacnetRequest)
    
    if (success) {
        // ✅ บันทึก Audit Log เมื่อเขียนสำเร็จ
        await auditLogService.recordLog({
            user_name: userName,
            action_type: 'WRITE',
            target_name: point.point_name,
            details: `Set value to ${value} (Priority: ${priority || 8})`
        })

        return { success: true, message: 'Write command sent successfully' }
    } else {
        throw new Error('Failed to write value')
    }
  }

  /**
   * Helper: ดึงข้อมูล Device จาก Database
   */
  private async getDeviceById(deviceId: number): Promise<Device | null> {
    const [device] = await sql`
      SELECT * FROM devices WHERE id = ${deviceId}
    `
    return (device as Device) || null
  }
}

export const pointsService = new PointsService()