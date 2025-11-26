import { Elysia, t } from 'elysia'
import { pointsService } from '../services/points.service'

export const pointsRoutes = new Elysia({ prefix: '/points' })

  // 1. ดึงรายชื่อ Points
  .get('/:deviceId', async ({ params: { deviceId } }) => {
    return await pointsService.getPointsByDeviceId(Number(deviceId))
  })

  // 2. Sync ข้อมูล
  .post('/sync', async ({ body }) => {
    const { deviceId } = body
    return await pointsService.syncPointsFromDevice(deviceId)
  }, {
    body: t.Object({ deviceId: t.Number() })
  })

  // 3. เขียนค่า (Write Value)
  .post('/write', async ({ body }) => {
    const { deviceId, pointId, value, priority } = body 
    // ในอนาคต user_name ควรรับมาจาก JWT/Session ตอนนี้ Hardcode ไปก่อน
    const userName = 'Admin' 

    return await pointsService.writePointValue(deviceId, pointId, value, priority, userName)
  }, {
    body: t.Object({
        deviceId: t.Number(),
        pointId: t.Number(),
        value: t.Any(),
        priority: t.Optional(t.Number())
    })
  })