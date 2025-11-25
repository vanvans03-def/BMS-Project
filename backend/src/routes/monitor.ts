import { Elysia, t } from 'elysia'
import { monitorService } from '../services/monitor.service'

export const monitorRoutes = new Elysia({ prefix: '/monitor' })

  /**
   * POST /monitor/read-device-points
   * อ่านค่า Real-time ของ Points ทั้งหมดในอุปกรณ์ (สำหรับ Polling)
   */
  .post('/read-device-points', async ({ body }) => {
    const { deviceId } = body
    return await monitorService.readDevicePoints(deviceId)
  }, {
    body: t.Object({
      deviceId: t.Number()
    })
  })