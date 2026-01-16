import { sql } from '../db'
import { historyTableService } from './history-table.service'
import { bacnetService } from './bacnet.service'
import { settingsService } from './settings.service'
import type { CreateDevicePayload } from '../dtos/bacnet.dto'

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

        const pollingInterval = dev.polling_interval || null

        // [NEW] Modbus & Hierarchy Fields
        const deviceType = dev.device_type || 'DEVICE'
        const parentId = dev.parent_id || null
        const connectionType = dev.connection_type || 'TCP'
        const tcpTimeout = dev.tcp_response_timeout || 1000

        const serialPortName = dev.serial_port_name || null
        const serialBaudRate = dev.serial_baud_rate || 9600
        const serialDataBits = dev.serial_data_bits || 8
        const serialStopBits = dev.serial_stop_bits || 1
        const serialParity = dev.serial_parity || 'none'

        const byteOrderFloat = dev.byte_order_float || 'Order3210'
        const byteOrderLong = dev.byte_order_long || 'Order3210'

        // [NEW] App 4 Fields
        const locationId = dev.location_id || null
        const isHistoryEnabled = dev.is_history_enabled || false

        const existing = await sql`SELECT id FROM devices WHERE device_instance_id = ${instanceId}`

        if (existing.length === 0) {
          const [newDev] = await sql`
            INSERT INTO devices (
                device_name, device_instance_id, ip_address, network_number,
                is_active, protocol, unit_id, polling_interval,
                location_id, is_history_enabled,
                
                device_type, parent_id, connection_type, tcp_response_timeout,
                serial_port_name, serial_baud_rate, serial_data_bits, serial_stop_bits, serial_parity,
                byte_order_float, byte_order_long
            ) VALUES (
                ${name}, ${instanceId}, ${ip}, ${network},
                true, ${protocol}, ${unitId}, ${pollingInterval},
                ${locationId}, ${isHistoryEnabled},

                ${deviceType}, ${parentId}, ${connectionType}, ${tcpTimeout},
                ${serialPortName}, ${serialBaudRate}, ${serialDataBits}, ${serialStopBits}, ${serialParity},
                ${byteOrderFloat}, ${byteOrderLong}
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
  async updateDevice(id: number, data: {
    logging_type?: string
    polling_interval?: number | null,
    device_name?: string,
    location_id?: number | null,
    is_history_enabled?: boolean
  }) {
    try {
      const updates: any = {}
      if (data.device_name !== undefined) updates.device_name = data.device_name
      // อนุญาตให้ส่ง null เพื่อ Reset กลับไปใช้ Default
      if (data.polling_interval !== undefined) updates.polling_interval = data.polling_interval

      if (data.location_id !== undefined) updates.location_id = data.location_id
      if (data.is_history_enabled !== undefined) updates.is_history_enabled = data.is_history_enabled
      if (data.logging_type !== undefined) updates.logging_type = data.logging_type



      if (Object.keys(updates).length === 0) return { success: true }

      await sql`
        UPDATE devices SET ${sql(updates)} WHERE id = ${id}
      `

      // [NEW] Provision Tables if History Enabled
      if (updates.is_history_enabled === true) {
        historyTableService.provisionTablesForDevice(id).catch(err => console.error('Provisioning failed', err))
      }

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