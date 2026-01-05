import { sql } from '../db'
import { bacnetService } from './bacnet.service'
import { settingsService } from './settings.service'
import type { CreateDeviceDto, CreateDevicePayload } from '../dtos/bacnet.dto'

export const devicesService = {
  // ... (getAllDevices, discoverDevices, addDevices เดิมคงไว้) ...
  async getAllDevices() {
    const rows = await sql`SELECT * FROM devices ORDER BY created_at ASC`
    return [...rows]
  },

  async discoverDevices() {
    const settings = await settingsService.getSettings()
    const timeoutMs = Number(settings.discovery_timeout) || 3000
    const timeoutSec = Math.ceil(timeoutMs / 1000)
    return await bacnetService.discoverDevices(timeoutSec)
  },

  async addDevices(devicesToAdd: CreateDevicePayload[]) {
    // ... (โค้ดเดิม) ...
    const results = await sql.begin(async sql => {
      const inserted = []
      for (const dev of devicesToAdd) {
        const instanceId = dev.device_instance_id
        const name = dev.device_name ?? `Device-${instanceId}`
        
        let ip = dev.ip_address ?? null
        const network = dev.network_number ?? 0
        const protocol = dev.protocol || 'BACNET'
        const unitId = dev.unit_id || null
        
        // @ts-ignore
        const pollingInterval = dev.polling_interval || null 

        const existing = await sql`SELECT id FROM devices WHERE device_instance_id = ${instanceId}`
        
        if (existing.length === 0) {
          const [newDev] = await sql`
            INSERT INTO devices (
                device_name, device_instance_id, ip_address, network_number,
                is_active, protocol, unit_id, polling_interval
            ) VALUES (
                ${name}, ${instanceId}, ${ip}, ${network},
                true, ${protocol}, ${unitId}, ${pollingInterval}
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

  // [NEW] ฟังก์ชันอัปเดตข้อมูลอุปกรณ์ (เช่น Polling Interval)
  async updateDevice(id: number, data: { polling_interval?: number | null, device_name?: string }) {
    try {
      const updates: any = {}
      if (data.device_name !== undefined) updates.device_name = data.device_name
      // อนุญาตให้ส่ง null เพื่อ Reset กลับไปใช้ Default
      if (data.polling_interval !== undefined) updates.polling_interval = data.polling_interval

      if (Object.keys(updates).length === 0) return { success: true }

      await sql`
        UPDATE devices SET ${sql(updates)} WHERE id = ${id}
      `
      return { success: true, message: 'Device updated successfully' }
    } catch (error) {
      console.error('Update device error:', error)
      return { success: false, message: 'Failed to update device' }
    }
  },

  // ... (deleteDevice เดิมคงไว้) ...
  async deleteDevice(deviceId: number) {
    try {
      const [device] = await sql`SELECT device_name, protocol FROM devices WHERE id = ${deviceId}`
      if (!device) return { success: false, message: 'Device not found' }

      await sql`DELETE FROM devices WHERE id = ${deviceId}`

      const { auditLogService } = await import('./audit-log.service')
      await auditLogService.recordLog({
        user_name: 'System',
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