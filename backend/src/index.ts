import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { devicesRoutes } from './routes/devices'
import { pointsRoutes } from './routes/points'
import { monitorRoutes } from './routes/monitor'
import { settingsRoutes } from './routes/setting'

const app = new Elysia()
  .use(cors())
  .use(devicesRoutes)
  .use(pointsRoutes)
  .use(monitorRoutes)
  .use(settingsRoutes)
  .listen(3000)

console.log(`🦊 Backend is running at ${app.server?.hostname}:${app.server?.port}`)

export type App = typeof app