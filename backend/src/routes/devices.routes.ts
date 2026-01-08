import { Elysia, t } from 'elysia'
import { devicesService } from '../services/devices.service'
import type { CreateDeviceDto } from '../dtos/bacnet.dto'

export const devicesRoutes = new Elysia({ prefix: '/devices' })

  .get('/', async () => {
    return await devicesService.getAllDevices()
  })

  .get('/discover', async () => {
    return await devicesService.discoverDevices()
  })

  .post('/', async ({ body }) => {
    return await devicesService.addDevices(body as any[])
  }, {
    body: t.Array(t.Object({
      device_name: t.String(),
      device_instance_id: t.Number(),
      ip_address: t.String(),
      network_number: t.Optional(t.Number()),
      protocol: t.Optional(t.String()),
      unit_id: t.Optional(t.Number()),
      polling_interval: t.Optional(t.Nullable(t.Number())),

      // [NEW] App 4 Fields
      location_id: t.Optional(t.Nullable(t.Number())),
      is_history_enabled: t.Optional(t.Boolean()),

      // New Report Fields
      // Removed: floor, room, zone, etc. (Moved to Hierarchy)
    }))
  })

  // [NEW] Route สำหรับอัปเดตอุปกรณ์
  .put('/:id', async ({ params, body }) => {
    return await devicesService.updateDevice(Number(params.id), body as any)
  }, {
    body: t.Object({
      device_name: t.Optional(t.String()),
      polling_interval: t.Optional(t.Nullable(t.Number())), // รองรับ null ได้

      location_id: t.Optional(t.Nullable(t.Number())),
      is_history_enabled: t.Optional(t.Boolean()),

      // New Report Fields
      // Removed: floor, room, zone, etc. (Moved to Hierarchy)
    })
  })

  .delete('/:id', async ({ params }) => {
    return await devicesService.deleteDevice(Number(params.id))
  })