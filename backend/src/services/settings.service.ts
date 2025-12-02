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
      // 1. บันทึกค่าลง DB (เหมือนเดิม)
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

      // 2. ✅ ตรวจสอบว่าเป็น Setting ของใคร เพื่อ Log ให้ถูก Protocol
      const keys = Object.keys(newSettings)
      let protocol: 'BACNET' | 'MODBUS' | 'ALL' = 'ALL'

      const isBacnet = keys.some(k => k.startsWith('bacnet') || k === 'discovery_timeout')
      const isModbus = keys.some(k => k.startsWith('modbus'))

      if (isBacnet) protocol = 'BACNET'
      else if (isModbus) protocol = 'MODBUS'

      // ถ้าเป็น General (site_name, etc) ให้เป็น ALL

      const keysChanged = keys.join(', ')
      await auditLogService.recordLog({
        user_name: userName,
        action_type: 'SETTING',
        target_name: 'System Configuration',
        details: `Updated settings: ${keysChanged}`,
        protocol: protocol // ✅ [UPDATED]
      })

      return true
    } catch (error) {
      console.error('❌ Update Settings Failed:', error)
      throw error
    }
  }
}