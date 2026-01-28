import { Elysia, t } from 'elysia'
import { pointsService } from '../services/points.service'
import { getActorName } from '../utils/auth.utils'

export const pointsRoutes = new Elysia({ prefix: '/points' })

  .get('/:deviceId', async ({ params: { deviceId } }) => {
    return await pointsService.getPointsByDeviceId(Number(deviceId))
  })

  // [NEW] Get points in hierarchy
  .get('/in-hierarchy', async () => {
    return await pointsService.getPointsInHierarchy()
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

  // [NEW] Add to Hierarchy
  .post('/add-to-hierarchy', async ({ body }) => {
    const { deviceId, pointIds } = body
    return await pointsService.addPointsToHierarchy(deviceId, pointIds)
  }, {
    body: t.Object({
      deviceId: t.Number(),
      pointIds: t.Array(t.Number())
    })
  })

  // [NEW] Toggle History
  .post('/history', async ({ body }) => {
    const { pointId, enabled } = body
    return await pointsService.togglePointHistory(pointId, enabled)
  }, {
    body: t.Object({
      pointId: t.Number(),
      enabled: t.Boolean()
    })
  })