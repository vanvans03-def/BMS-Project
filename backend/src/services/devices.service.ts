import { sql } from '../db'
import { bacnetService } from './bacnet.service'
import { settingsService } from './settings.service'
import type { CreateDeviceDto, CreateDevicePayload } from '../dtos/bacnet.dto'

export const devicesService = {
  /**
   * ดึงรายการอุปกรณ์ทั้งหมด
   */
  async getAllDevices() {
    const rows = await sql`SELECT * FROM devices ORDER BY created_at ASC`
    return [...rows]
  },

  /**
   * สแกนหาอุปกรณ์ BACnet (Discovery)
   */
  async discoverDevices() {
    const settings = await settingsService.getSettings()
    const timeoutMs = Number(settings.discovery_timeout) || 3000
    const timeoutSec = Math.ceil(timeoutMs / 1000)
    return await bacnetService.discoverDevices(timeoutSec)
  },

  /**
   * เพิ่มอุปกรณ์ใหม่ (รองรับทั้ง BACnet และ Modbus)
   */
  async addDevices(devicesToAdd: CreateDevicePayload[]) {
    const results = await sql.begin(async sql => {
      const inserted = []
      for (const dev of devicesToAdd) {
        const instanceId = dev.device_instance_id
        const name = dev.device_name ?? `Device-${instanceId}`
        
        // [UPDATED] จัดการ IP และ Port
        let ip = dev.ip_address ?? null
        
        // ถ้าเป็น Modbus และมี port ระบุมา ให้แยกเก็บ
        // แต่ใน DB เก็บแบบรวมกัน เช่น "192.168.1.100:502"
        
        const network = dev.network_number ?? 0
        const protocol = dev.protocol || 'BACNET'
        const unitId = dev.unit_id || null

        // เช็คซ้ำ
        const existing = await sql`
          SELECT id FROM devices WHERE device_instance_id = ${instanceId}
        `
        
        if (existing.length === 0) {
          const [newDev] = await sql`
            INSERT INTO devices (
                device_name, 
                device_instance_id, 
                ip_address, 
                network_number,
                is_active,
                protocol,
                unit_id
            ) VALUES (
                ${name}, 
                ${instanceId}, 
                ${ip}, 
                ${network},
                true,
                ${protocol},
                ${unitId}
            )
            RETURNING *
          `
          inserted.push(newDev)
        }
      }
      return inserted
    })

    return { success: true, added: results.length }
  },

  /**
   * [NEW] ลบอุปกรณ์
   */
  async deleteDevice(deviceId: number) {
    try {
      // ดึงข้อมูลอุปกรณ์ก่อนลบ (เพื่อ Log)
      const [device] = await sql`
        SELECT device_name, protocol FROM devices WHERE id = ${deviceId}
      `

      if (!device) {
        return { success: false, message: 'Device not found' }
      }

      // ลบอุปกรณ์ (Points จะถูกลบตาม Cascade)
      await sql`DELETE FROM devices WHERE id = ${deviceId}`

      // บันทึก Audit Log
      const { auditLogService } = await import('./audit-log.service')
      await auditLogService.recordLog({
        user_name: 'System', // หรือดึงจาก JWT ถ้ามี
        action_type: 'SETTING',
        target_name: device.device_name,
        details: `Deleted ${device.protocol || 'BACNET'} device`,
        protocol: device.protocol || 'BACNET'
      })

      return { success: true, message: 'Device deleted successfully' }
    } catch (error) {
      console.error('Delete device error:', error)
      return { success: false, message: 'Failed to delete device' }
    }
  }
}