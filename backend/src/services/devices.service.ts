import { sql } from '../db'
import { bacnetService } from './bacnet.service'
import type { CreateDeviceDto } from '../dtos/bacnet.dto'

export const devicesService = {
  /**
   * ดึงรายการอุปกรณ์ทั้งหมด
   */
  async getAllDevices() {
    const rows = await sql`SELECT * FROM devices ORDER BY created_at ASC`
    return [...rows]
  },

  /**
   * สแกนหาอุปกรณ์ (Discovery)
   */
  async discoverDevices() {
    return await bacnetService.discoverDevices(3)
  },

  /**
   * เพิ่มอุปกรณ์ลง Database
   */
  async addDevices(devicesToAdd: CreateDeviceDto[]) {
    const results = await sql.begin(async sql => {
      const inserted = []
      for (const dev of devicesToAdd) {
        const instanceId = dev.device_instance_id;
        const name = dev.device_name ?? `Device-${instanceId}`;
        const ip = dev.ip_address ?? null; 
        const network = dev.network_number ?? 0; 

        if (instanceId === undefined || instanceId === null) {
            continue;
        }

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
                is_active
            ) VALUES (
                ${name}, 
                ${instanceId}, 
                ${ip}, 
                ${network},
                true
            )
            RETURNING *
          `
          inserted.push(newDev)
        }
      }
      return inserted
    })

    return { success: true, added: results.length }
  }
}