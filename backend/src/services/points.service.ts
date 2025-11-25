import { sql } from '../db'
import { bacnetService } from './bacnet.service'
import type { Point,Device, SyncPointsResult } from '../dtos/points.dto'

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
   * ดึง Point เดียวตาม ID
   */
  async getPointById(pointId: number): Promise<Point | null> {
    const [point] = await sql`
      SELECT * FROM points WHERE id = ${pointId}
    `
    
    return (point as Point) || null
  }

  /**
   * สร้าง Point ใหม่
   */
  async createPoint(point: Omit<Point, 'id' | 'created_at'>): Promise<Point> {
    const [newPoint] = await sql`
      INSERT INTO points ${sql(point)}
      RETURNING *
    `
    
    return newPoint as Point
  }

  /**
   * อัพเดท Point
   */
  async updatePoint(pointId: number, updates: Partial<Point>): Promise<Point | null> {
    const [updated] = await sql`
      UPDATE points 
      SET ${sql(updates)}
      WHERE id = ${pointId}
      RETURNING *
    `
    
    return (updated as Point) || null
  }

  /**
   * ลบ Point
   */
  async deletePoint(pointId: number): Promise<boolean> {
    const result = await sql`
      DELETE FROM points WHERE id = ${pointId}
    `
    
    return result.count > 0
  }

  /**
   * ลบ Points ทั้งหมดของ Device
   */
  async deletePointsByDeviceId(deviceId: number): Promise<number> {
    const result = await sql`
      DELETE FROM points WHERE device_id = ${deviceId}
    `
    
    return result.count
  }

  /**
   * Sync Points จากอุปกรณ์จริง (ผ่าน C# API) ลง Database
   * - ดึง Object List จากอุปกรณ์
   * - ลบข้อมูลเก่า
   * - บันทึกข้อมูลใหม่
   */
  async syncPointsFromDevice(deviceId: number): Promise<SyncPointsResult> {
    try {
      // 1. หา Device จาก Database
      const device = await this.getDeviceById(deviceId)
      
      if (!device) {
        return { 
          success: false, 
          message: 'Device not found' 
        }
      }

      console.log(`🔄 [PointsService] Syncing points for device: ${device.device_name} (Instance ID: ${device.device_instance_id})`)

      // 2. เรียก BACnet API เพื่อดึง Object List จากอุปกรณ์
      const objects = await bacnetService.getObjects(device.device_instance_id)

      if (objects.length === 0) {
        console.warn(`⚠️ [PointsService] No objects found on device ${device.device_instance_id}`)
        return { 
          success: false, 
          message: 'No objects found on device' 
        }
      }

      console.log(`✅ [PointsService] Found ${objects.length} objects from device`)

      // 3. ลบข้อมูลเก่าออกก่อน (Full Sync Strategy)
      const deletedCount = await this.deletePointsByDeviceId(deviceId)
      console.log(`🗑️ [PointsService] Deleted ${deletedCount} old points`)

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

      console.log(`✅ [PointsService] Inserted ${points.length} new points`)

      return { 
        success: true, 
        count: points.length, 
        points 
      }

    } catch (error) {
      console.error('❌ [PointsService] Sync failed:', error)
      throw error
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

  // --- REMOVED: readPointValue & writePointValue ---
  // ย้ายไปใช้ MonitorService แทน เพื่อลดความซ้ำซ้อนและรวม Logic การสั่งงานไว้ที่เดียว
}

export const pointsService = new PointsService()