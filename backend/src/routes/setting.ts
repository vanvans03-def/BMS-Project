import { Elysia, t } from 'elysia'
import { settingsService } from '../services/settings.service'

export const settingsRoutes = new Elysia({ prefix: '/settings' })

  // 1. GET /settings - ดึงค่าทั้งหมดไปโชว์ใน Form
  .get('/', async () => {
    return await settingsService.getSettings()
  })

  // 2. PUT /settings - บันทึกค่าจาก Form
  .put('/', async ({ body }) => {
    // รับ Body เป็น Object อะไรก็ได้ (Flexible)
    const settings = body as Record<string, any>
    
    await settingsService.updateSettings(settings)
    
    return { success: true, message: 'Settings saved successfully' }
  }, {
    // Validation แบบหลวมๆ เพื่อให้รับค่าได้หลากหลาย
    body: t.Record(t.String(), t.Any())
  })