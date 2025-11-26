import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { devicesRoutes } from './routes/devices'
import { pointsRoutes } from './routes/points'
import { monitorRoutes } from './routes/monitor'
import { settingsRoutes } from './routes/setting'
import { usersRoutes } from './routes/users'
import { databaseRoutes } from './routes/database'
import { auditLogRoutes } from './routes/audit-logs'
import { authRoutes } from './routes/auth'
import jwt from 'jsonwebtoken' // Import เพิ่ม

const JWT_SECRET = process.env.JWT_SECRET || 'fallback'

const app = new Elysia()
  .use(cors())
  .use(authRoutes)

  .onBeforeHandle(({ request, set }) => {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/auth')) return

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
  
  .listen(3000)

console.log(`🦊 Backend is running at ${app.server?.hostname}:${app.server?.port}`)

export type App = typeof app