import { Elysia, t } from 'elysia'
import { devicesService } from '../services/devices.service'


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

      // [NEW] Modbus & Hierarchy Fields
      device_type: t.Optional(t.String()),
      parent_id: t.Optional(t.Nullable(t.Number())),
      connection_type: t.Optional(t.String()),
      tcp_response_timeout: t.Optional(t.Number()),
      serial_port_name: t.Optional(t.String()),
      serial_baud_rate: t.Optional(t.Number()),
      serial_data_bits: t.Optional(t.Number()),
      serial_stop_bits: t.Optional(t.Number()),
      serial_parity: t.Optional(t.String()),
      byte_order_float: t.Optional(t.String()),
      byte_order_long: t.Optional(t.String()),

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
      logging_type: t.Optional(t.String()),

      // New Report Fields
      // Removed: floor, room, zone, etc. (Moved to Hierarchy)
    })
  })

  .delete('/:id', async ({ params }) => {
    return await devicesService.deleteDevice(Number(params.id))
  })