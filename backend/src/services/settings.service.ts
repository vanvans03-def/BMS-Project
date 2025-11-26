import { sql } from '../db'
import { auditLogService } from './audit-log.service'
import type { SystemSettings } from '../dtos/setting.dto'

export const settingsService = {
  async getSettings(): Promise<SystemSettings> {
    try {
      const rows = await sql`SELECT key_name, value_text FROM system_settings`
      const settings: SystemSettings = {}
      
      for (const row of rows) {
        const key = row.key_name
        const value = row.value_text
        const numVal = Number(value)
        if (!isNaN(numVal) && value.trim() !== '') {
            settings[key] = numVal
        } else {
            settings[key] = value
        }
      }
      return settings
    } catch (error) {
      console.error('❌ Get Settings Failed:', error)
      return {}
    }
  },

  // [MODIFIED] รับ userName เพื่อบันทึก Log
  async updateSettings(newSettings: SystemSettings, userName: string = 'Admin'): Promise<boolean> {
    try {
      // 1. บันทึกค่าลง DB
      await sql.begin(async sql => {
        for (const [key, value] of Object.entries(newSettings)) {
            if (value === undefined || value === null) continue;
            const valueStr = String(value)
            await sql`
              INSERT INTO system_settings (key_name, value_text, updated_at)
              VALUES (${key}, ${valueStr}, NOW())
              ON CONFLICT (key_name) 
              DO UPDATE SET 
                value_text = EXCLUDED.value_text,
                updated_at = NOW()
            `
        }
      })

      // 2. ✅ บันทึก Audit Log ใน Service เลย
      const keysChanged = Object.keys(newSettings).join(', ')
      await auditLogService.recordLog({
          user_name: userName,
          action_type: 'SETTING',
          target_name: 'System Configuration',
          details: `Updated settings: ${keysChanged}`
      })
      
      return true
    } catch (error) {
      console.error('❌ Update Settings Failed:', error)
      throw error
    }
  }
}