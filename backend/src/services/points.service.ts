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
        register_type, 
        data_type,
        data_format,
        config,
        universal_type
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

    const pointsToInsert = objects.map(obj => {
      // 1. Determine Universal Type
      let universalType = 'NUMERIC_R' // Default
      const typeLower = obj.objectType.toLowerCase()

      if (typeLower.includes('binary') || typeLower.includes('digital')) {
        if (typeLower.includes('input')) universalType = 'BOOLEAN_R'
        else universalType = 'BOOLEAN_W' // Output or Value
      } else if (typeLower.includes('analog') || typeLower.includes('multistate')) {
        if (typeLower.includes('input')) universalType = 'NUMERIC_R'
        else universalType = 'NUMERIC_W'
      } else if (typeLower.includes('accumulator') || typeLower.includes('loop')) {
        universalType = 'NUMERIC_R'
      } else if (typeLower.includes('characterstring') || typeLower.includes('string')) {
        universalType = 'STRING'
      }

      // 2. Create Config
      const pointConfig = {
        pollFrequency: "Normal",
        bacnet: {
          objectType: obj.objectType,
          instanceNumber: obj.instance
        },
        type: universalType
      }

      return {
        device_id: deviceId,
        object_type: obj.objectType,
        object_instance: obj.instance,
        point_name: `${obj.objectType}_${obj.instance}`,
        is_monitor: true,
        universal_type: universalType || 'NUMERIC_R', // Fallback
        config: pointConfig // Pass raw object, postgres.js handles jsonb
      }
    })

    // Debug log (will appear in backend console)
    console.log('Syncing Points Sample:', pointsToInsert[0])

    const result = await sql`
        INSERT INTO points ${sql(pointsToInsert, 'device_id', 'object_type', 'object_instance', 'point_name', 'is_monitor', 'universal_type', 'config')} 
        RETURNING *
    `
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
    // [FIX] Reverting to strict types based on User's working example: { "value": 22 }
    let safeValue = value;
    const typeLower = point.object_type.toLowerCase();

    if (typeLower.includes('analog') || typeLower.includes('multistate') || typeLower.includes('accumulator')) {
      // User confirmed { "value": 22 } works, so we send Number.
      safeValue = Number(value);
    }
    // For Binary/Digital, we keep as is (likely String "active" or "inactive" or Boolean/Number 0/1)

    const bacnetRequest: WriteRequestDto = {
      deviceId: device.device_instance_id,
      objectType: point.object_type,
      instance: point.object_instance,
      propertyId: 'PROP_PRESENT_VALUE',
      value: safeValue,
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