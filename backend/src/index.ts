import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { devicesRoutes } from './routes/devices.routes'
import { pointsRoutes } from './routes/points.routes'
import { monitorRoutes } from './routes/monitor.routes'
import { settingsRoutes } from './routes/setting.routes'
import { usersRoutes } from './routes/users.routes'
import { databaseRoutes } from './routes/database.routes'
import { auditLogRoutes } from './routes/audit-logs.routes'
import { authRoutes } from './routes/auth.routes'
import { integrationRoutes } from './routes/integration.routes'
import { modbusRoutes } from './routes/modbus.routes'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback'

const app = new Elysia()
  .use(cors())
  .use(authRoutes)

  .onBeforeHandle(({ request, set }) => {
    const url = new URL(request.url)
    // Allow Auth and Integration (Niagara) endpoints
    if (url.pathname.startsWith('/auth') || url.pathname.startsWith('/integration')) return

    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      set.status = 401
      return { success: false, message: 'Authentication required' }
    }

    try {
      jwt.verify(token, JWT_SECRET)
    } catch (err) {
      set.status = 403
      return { success: false, message: 'Invalid or expired token' }
    }
  })

  .use(devicesRoutes)
  .use(pointsRoutes)
  .use(monitorRoutes)
  .use(settingsRoutes)
  .use(usersRoutes)
  .use(databaseRoutes)
  .use(auditLogRoutes)
  .use(modbusRoutes)
  .use(integrationRoutes) // Register Integration Routes
  .listen(3000)

console.log(`🦊 Backend is running at ${app.server?.hostname}:${app.server?.port}`)

export type App = typeof app