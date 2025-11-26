import { Elysia, t } from 'elysia'
import { settingsService } from '../services/settings.service'
import { getActorName } from '../utils/auth.utils'

export const settingsRoutes = new Elysia({ prefix: '/settings' })

  .get('/', async () => {
    return await settingsService.getSettings()
  })

  .put('/', async ({ body, request }) => {
    const newSettings = body as Record<string, any>
    const userName = getActorName(request)
    await settingsService.updateSettings(newSettings, userName) 
    
    return { success: true, message: 'Settings saved successfully' }
  }, {
    body: t.Record(t.String(), t.Any())
  })