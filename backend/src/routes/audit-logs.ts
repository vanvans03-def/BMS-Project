import { Elysia, t } from 'elysia'
import { auditLogService } from '../services/audit-log.service'

export const auditLogRoutes = new Elysia({ prefix: '/audit-logs' })
  
  // GET /audit-logs - ดึงข้อมูล Logs ล่าสุด
  .get('/', async () => {
    return await auditLogService.getLogs(100) // ดึง 100 รายการล่าสุด
  })