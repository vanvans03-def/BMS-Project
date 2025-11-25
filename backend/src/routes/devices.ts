import { Elysia, t } from 'elysia'
import { sql } from '../db'
import { bacnetService } from '../services/bacnet.service'
import type { CreateDeviceDto } from '../dtos/bacnet.dto'

export const devicesRoutes = new Elysia({ prefix: '/devices' })
  
  // 1. ดึงรายการอุปกรณ์
  .get('/', async () => {
    const rows = await sql`SELECT * FROM devices ORDER BY created_at ASC`
    // [FIX] แปลง RowList ของ Postgres ให้เป็น Array ธรรมดาชัวร์ๆ
    return [...rows]
  })

  // 2. สแกนหาอุปกรณ์ (วิ่งไปถาม C# API)
  .get('/discover', async () => {
    const devices = await bacnetService.discoverDevices(3)
    return devices
  })

  // 3. เพิ่มอุปกรณ์ลง Database
  .post('/', async ({ body }) => {
    const devicesToAdd = body as CreateDeviceDto[]
    
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
  }, {
    body: t.Array(t.Object({
        device_name: t.String(),
        device_instance_id: t.Number(),
        ip_address: t.String(),
        network_number: t.Optional(t.Number())
    }))
  })