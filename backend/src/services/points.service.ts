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
        is_history_enabled,
        location_id,
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

  // [NEW] Get all points that are assigned to a location
  async getPointsInHierarchy(): Promise<Point[]> {
    const result = await sql`
        SELECT * FROM points WHERE location_id IS NOT NULL ORDER BY device_id, id
      `
    return Array.from(result) as Point[]
  }

  async syncPointsFromDevice(deviceId: number): Promise<SyncPointsResult> {
    const device = await this.getDeviceById(deviceId)
    if (!device) throw new Error('Device not found')
    const objects = await bacnetService.getObjects(device.device_instance_id)
    if (objects.length === 0) return { success: false, message: 'No objects' }

    // [UPDATED] Non-destructive Sync (UPSERT)
    // We do NOT delete all points anymore. We update existing ones or insert new ones.

    const pointsToUpsert = objects.map(obj => {
      // 1. Determine Universal Type
      let universalType = 'NUMERIC_R' // Default
      const typeLower = obj.objectType.toLowerCase()

      let pointName = `${obj.objectType.replace('OBJECT_', '')}_${obj.instance}`;
      let isMonitor = true;

      // Type Logic ...
      if (typeLower.includes('binary') || typeLower.includes('digital')) {
        if (typeLower.includes('input')) universalType = 'BOOLEAN_R'
        else universalType = 'BOOLEAN_W'
      } else if (typeLower.includes('analog') || typeLower.includes('multistate')) {
        if (typeLower.includes('input')) universalType = 'NUMERIC_R'
        else universalType = 'NUMERIC_W'
      } else if (typeLower.includes('accumulator') || typeLower.includes('loop')) {
        universalType = 'NUMERIC_R'
      } else if (typeLower.includes('device')) {
        pointName = 'DEVICE';
        isMonitor = false;
        universalType = 'DEVICE';
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
        point_name: pointName,
        is_monitor: isMonitor,
        universal_type: universalType,
        config: pointConfig
      }
    })

    // Upsert Logic
    // Conflict target: (device_id, object_type, object_instance) must be unique
    // UPDATE SET: point_name, universal_type, config (Keep location_id, is_monitor, is_history_enabled as is)

    const result = await sql`
        INSERT INTO points ${sql(pointsToUpsert, 'device_id', 'object_type', 'object_instance', 'point_name', 'is_monitor', 'universal_type', 'config')} 
        ON CONFLICT (device_id, object_type, object_instance) 
        DO UPDATE SET
            point_name = EXCLUDED.point_name,
            universal_type = EXCLUDED.universal_type,
            config = EXCLUDED.config
            -- We do NOT update is_monitor, is_history_enabled, location_id to preserve user settings
        RETURNING *
    `
    return { success: true, count: result.length, points: Array.from(result) as Point[] }
  }

  // [NEW] Add Points to Hierarchy (Niagara Style)
  async addPointsToHierarchy(deviceId: number, pointIds: number[]) {
    if (!pointIds || pointIds.length === 0) return { success: false, message: 'No points selected' }

    // 1. Get Device Info & Try to Find Gateway Name
    // For BACnet: via network_config
    // For Modbus: via parent_id (Gateway Device)
    const devices = await sql`
        SELECT 
            d.*, 
            dc.network_config_id, 
            nc.name as network_name,
            parent.device_name as parent_device_name
        FROM devices d
        LEFT JOIN device_config dc ON d.id = dc.device_id
        LEFT JOIN network_config nc ON dc.network_config_id = nc.id
        LEFT JOIN devices parent ON d.parent_id = parent.id
        WHERE d.id = ${deviceId}
      `

    if (devices.length === 0) throw new Error('Device not found')
    const device = devices[0]!

    // [UPDATED] Determine Gateway Name (Folder Name)
    let gatewayName = 'Unknown Gateway'

    if (device.network_name) {
      gatewayName = device.network_name // BACnet typical
    } else if (device.parent_device_name) {
      gatewayName = device.parent_device_name // Modbus typical (Gateway is the parent device)
    } else {
      // Fallback or Standalone
      gatewayName = `Network_${device.protocol}`
    }

    // 2. Ensure Gateway Folder exists
    let [gatewayLoc] = await sql`SELECT id FROM locations WHERE name = ${gatewayName} AND type = 'Folder' LIMIT 1`

    if (!gatewayLoc) {
      [gatewayLoc] = await sql`
          INSERT INTO locations (name, type, description) 
          VALUES (${gatewayName}, 'Folder', 'Auto-generated Gateway Folder') 
          RETURNING id
        `
    }

    // 3. Ensure Device Folder exists (Parent = Gateway Folder)
    let [deviceLoc] = await sql`
      SELECT id FROM locations 
      WHERE name = ${device.device_name} 
      AND parent_id = ${gatewayLoc!.id} 
      LIMIT 1
    `

    if (!deviceLoc) {
      [deviceLoc] = await sql`
          INSERT INTO locations (parent_id, name, type, description)
          VALUES (${gatewayLoc!.id}, ${device.device_name}, 'Device', 'Auto-generated Device Folder')
          RETURNING id
        `

      // Link Device to this Location (Optional but good for tracking)
      await sql`UPDATE devices SET location_id = ${deviceLoc!.id} WHERE id = ${deviceId}`
    }

    // 4. Update Points location_id
    await sql`
      UPDATE points 
      SET location_id = ${deviceLoc!.id} 
      WHERE id IN ${sql(pointIds)}
    `

    return { success: true, message: `Added ${pointIds.length} points to hierarchy` }
  }

  // [NEW] Toggle History
  async togglePointHistory(pointId: number, enabled: boolean) {
    await sql`UPDATE points SET is_history_enabled = ${enabled} WHERE id = ${pointId}`
    return { success: true, is_history_enabled: enabled }
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
        ip: device.ip_address, // Ensure IP is passed
        deviceId: device.device_instance_id,
        objectType: point.object_type,
        instance: point.object_instance,
        propertyId: 85
      }]
      const readRes = await bacnetService.readMultiple(readReq)
      if (readRes && readRes.length > 0) {
        // [FIXED] ใช้ ?. เพื่อป้องกัน error Object is possibly 'undefined'
        oldValue = readRes[0]?.value ?? 'Unknown'
      }
    } catch (err) {
      console.warn('Could not read old value for log:', err)
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
      ip: device.ip_address,
      deviceId: device.device_instance_id,
      objectType: point.object_type,
      instance: point.object_instance,
      propertyId: 85,
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