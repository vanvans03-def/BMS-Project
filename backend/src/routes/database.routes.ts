import { Elysia, t } from 'elysia'
import { databaseService } from '../services/database.service'

export const databaseRoutes = new Elysia({ prefix: '/database' })

  // 1. GET /database/stats - ดึงสถิติระบบ
  .get('/stats', async () => {
    return await databaseService.getSystemStats()
  })

  // 2. POST /database/clear-all - ลบข้อมูลทั้งหมด (ระวัง!)
  .post('/clear-all', async ({ body }) => {
    const { confirmText, protocol } = body // [UPDATED] รับ protocol

    if (confirmText !== 'DELETE ALL DATA') {
      return { success: false, message: 'Confirmation text does not match' }
    }

    await databaseService.clearAllData(protocol)
    return { success: true, message: 'Data deleted successfully' }
  }, {
    body: t.Object({
      confirmText: t.String(),
      protocol: t.Optional(t.String()) // [UPDATED]
    })
  })

  // 3. GET /database/backup-info - ข้อมูล Backup (Mock)
  .get('/backup-info', async () => {
    return await databaseService.getBackupInfo()
  })

  // 4. POST /database/optimize - Optimize Database
  .post('/optimize', async () => {
    await databaseService.optimizeDatabase()
    return {
      success: true,
      message: 'Database optimized successfully'
    }
  })