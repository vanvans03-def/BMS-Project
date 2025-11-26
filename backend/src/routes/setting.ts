import { Elysia, t } from 'elysia'
import { settingsService } from '../services/settings.service'
import { auditLogService } from '../services/audit-log.service' // [NEW] Import

export const settingsRoutes = new Elysia({ prefix: '/settings' })

  .get('/', async () => {
    return await settingsService.getSettings()
  })

  // [MODIFIED] บันทึก Log เมื่อมีการแก้ไข Settings
  .put('/', async ({ body }) => {
    const newSettings = body as Record<string, any>
    
    // 1. (Optional) ดึงค่าเก่ามาเทียบเพื่อ Log ว่าเปลี่ยนจากอะไรเป็นอะไร
    // แต่เพื่อความง่าย เราจะ Log แค่ว่ามีการอัปเดต Key ไหนบ้าง
    const keysChanged = Object.keys(newSettings).join(', ')

    await settingsService.updateSettings(newSettings)
    
    // [NEW] ✅ บันทึก Audit Log
    await auditLogService.recordLog({
        user_name: 'Admin', // Mock User
        action_type: 'SETTING',
        target_name: 'System Configuration',
        details: `Updated settings: ${keysChanged}`
    })
    
    return { success: true, message: 'Settings saved successfully' }
  }, {
    body: t.Record(t.String(), t.Any())
  })