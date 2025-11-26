import { Elysia, t } from 'elysia'
import { pointsService } from '../services/points.service'
import { getActorName } from '../utils/auth.utils' 

export const pointsRoutes = new Elysia({ prefix: '/points' })

  .get('/:deviceId', async ({ params: { deviceId } }) => {
    return await pointsService.getPointsByDeviceId(Number(deviceId))
  })

  .post('/sync', async ({ body }) => {
    const { deviceId } = body
    return await pointsService.syncPointsFromDevice(deviceId)
  }, {
    body: t.Object({ deviceId: t.Number() })
  })

  .post('/write', async ({ body, request }) => {
    const { deviceId, pointId, value, priority } = body 
    
    const userName = getActorName(request)

    return await pointsService.writePointValue(deviceId, pointId, value, priority, userName)
  }, {
    body: t.Object({
        deviceId: t.Number(),
        pointId: t.Number(),
        value: t.Any(),
        priority: t.Optional(t.Number())
    })
  })