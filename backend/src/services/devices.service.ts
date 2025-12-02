import { sql } from '../db'
import { bacnetService } from './bacnet.service'
import { settingsService } from './settings.service' // [UPDATED] Import settingsService
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
   * สแกนหาอุปกรณ์ (Discovery) - [UPDATED] ใช้ค่าจาก Settings
   */
  async discoverDevices() {
    // 1. ดึงค่า Config จาก Database
    const settings = await settingsService.getSettings()
    
    // 2. ดึงค่า timeout (ms) ถ้าไม่มีให้ใช้ Default 3000ms
    const timeoutMs = Number(settings.discovery_timeout) || 3000
    
    // 3. แปลง ms เป็น seconds (เพราะ bacnetService รับเป็นวินาที)
    // ปัดเศษขึ้น เช่น 3500ms -> 4s
    const timeoutSec = Math.ceil(timeoutMs / 1000)

    // console.log(`🔍 Discovery with timeout: ${timeoutMs}ms (${timeoutSec}s)`)

    return await bacnetService.discoverDevices(timeoutSec)
  },

  
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