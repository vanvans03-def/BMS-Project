import { Elysia, t } from 'elysia'
import { settingsService } from '../services/settings.service'

export const settingsRoutes = new Elysia({ prefix: '/settings' })

  .get('/', async () => {
    return await settingsService.getSettings()
  })

  .put('/', async ({ body }) => {
    const newSettings = body as Record<string, any>
    // เรียก Service บรรทัดเดียวจบ (Service จัดการทั้ง DB และ Log)
    await settingsService.updateSettings(newSettings, 'Admin') 
    
    return { success: true, message: 'Settings saved successfully' }
  }, {
    body: t.Record(t.String(), t.Any())
  })