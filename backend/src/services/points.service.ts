import { sql } from '../db'
import { bacnetService } from './bacnet.service'
import { auditLogService } from './audit-log.service'
import type { Point, Device, SyncPointsResult } from '../dtos/points.dto'
import type { WriteRequestDto, ReadRequestDto } from '../dtos/bacnet.dto'

class PointsService {

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
        created_at,
        register_type, 
        data_type,
        data_format 
      FROM points 
      WHERE device_id = ${deviceId} 
      ORDER BY object_type, object_instance
    `
    return Array.from(result) as Point[]
  }

  async syncPointsFromDevice(deviceId: number): Promise<SyncPointsResult> {
    const device = await this.getDeviceById(deviceId)
    if (!device) throw new Error('Device not found')
    const objects = await bacnetService.getObjects(device.device_instance_id)
    if (objects.length === 0) return { success: false, message: 'No objects' }
    await sql`DELETE FROM points WHERE device_id = ${deviceId}`
    const pointsToInsert = objects.map(obj => ({
      device_id: deviceId,
      object_type: obj.objectType,
      object_instance: obj.instance,
      point_name: `${obj.objectType}_${obj.instance}`,
      is_monitor: true
    }))
    const result = await sql`INSERT INTO points ${sql(pointsToInsert)} RETURNING *`
    return { success: true, count: result.length, points: Array.from(result) as Point[] }
  }

  /**
   * สั่งเขียนค่าลง Point (Write Value) พร้อมบันทึก Log แบบละเอียด
   */
  async writePointValue(deviceId: number, pointId: number, value: any, priority?: number, userName: string = 'System') {
    // 1. หา Device
    const device = await this.getDeviceById(deviceId)
    if (!device) throw new Error('Device not found')

    // 2. หา Point
    const [point] = await sql`SELECT object_type, object_instance, point_name FROM points WHERE id = ${pointId}`
    if (!point) throw new Error('Point not found in database')

    // 3. [NEW] อ่านค่าปัจจุบันก่อน (Old Value) เพื่อเอามาทำ Log
    // [FIXED] กำหนด type เป็น any เพื่อให้รับค่าตัวเลข/boolean ได้ โดยไม่ error เรื่อง type string
    let oldValue: any = 'Unknown'
    try {
      const readReq: ReadRequestDto[] = [{
        deviceId: device.device_instance_id,
        objectType: point.object_type,
        instance: point.object_instance,
        propertyId: 'PROP_PRESENT_VALUE'
      }]
      const readRes = await bacnetService.readMultiple(readReq)
      if (readRes && readRes.length > 0) {
        // [FIXED] ใช้ ?. เพื่อป้องกัน error Object is possibly 'undefined'
        oldValue = readRes[0]?.value ?? 'Unknown'
      }
    } catch (err) {
      console.warn('⚠️ Could not read old value for log:', err)
    }

    // 4. ส่งคำสั่งเขียนค่า (Write)
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
      const targetDisplay = `[${device.device_name}] ${point.point_name}`
      const detailDisplay = `${oldValue} -> ${value} (Pri: ${priority || 8})`

      await auditLogService.recordLog({
        user_name: userName,
        action_type: 'WRITE',
        target_name: targetDisplay,
        details: detailDisplay,
        protocol: 'BACNET'
      })

      return { success: true, message: 'Write command sent successfully' }
    } else {
      throw new Error('Failed to write value')
    }
  }

  private async getDeviceById(deviceId: number): Promise<Device | null> {
    const [device] = await sql`SELECT * FROM devices WHERE id = ${deviceId}`
    return (device as Device) || null
  }
}

export const pointsService = new PointsService()