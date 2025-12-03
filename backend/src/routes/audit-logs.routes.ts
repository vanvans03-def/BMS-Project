import { Elysia, t } from 'elysia'
import { auditLogService } from '../services/audit-log.service'

export const auditLogRoutes = new Elysia({ prefix: '/audit-logs' })
  
  .get('/', async ({ query }) => {
    return await auditLogService.getLogs({
        search: query.search,
        actionType: query.actionType,
        startDate: query.startDate,
        endDate: query.endDate,
        user: query.user,
        protocols: query.protocols
    })
  }, {
    query: t.Object({
        search: t.Optional(t.String()),
        actionType: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        user: t.Optional(t.String()),
        protocols: t.Optional(t.String())
    })
  })