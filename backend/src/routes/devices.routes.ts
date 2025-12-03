import { Elysia, t } from 'elysia'
import { devicesService } from '../services/devices.service'
import type { CreateDeviceDto } from '../dtos/bacnet.dto'

export const devicesRoutes = new Elysia({ prefix: '/devices' })
  
  // 1. ดึงรายการอุปกรณ์
  .get('/', async () => {
    return await devicesService.getAllDevices()
  })

  // 2. สแกนหาอุปกรณ์
  .get('/discover', async () => {
    return await devicesService.discoverDevices()
  })

  // 3. เพิ่มอุปกรณ์ลง Database
  .post('/', async ({ body }) => {
    return await devicesService.addDevices(body as CreateDeviceDto[])
  }, {
    body: t.Array(t.Object({
        device_name: t.String(),
        device_instance_id: t.Number(),
        ip_address: t.String(),
        network_number: t.Optional(t.Number())
    }))
  })