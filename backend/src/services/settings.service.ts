import { sql } from '../db'
import type { SystemSettings } from '../dtos/setting.dto'


export const settingsService = {
  /**
   * ดึงค่า Settings ทั้งหมดจาก Database
   * แปลงจาก Row (Key-Value) -> Object JSON
   */
  async getSettings(): Promise<SystemSettings> {
    try {
      // ดึงข้อมูลทั้งหมดจากตาราง
      const rows = await sql`SELECT key_name, value_text FROM system_settings`
      
      // แปลง Array of Rows เป็น Object เดียว
      const settings: SystemSettings = {}
      
      for (const row of rows) {
        const key = row.key_name
        const value = row.value_text

        // พยายามแปลงตัวเลข ถ้าเป็นตัวเลข (เช่น Port, ID)
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

  /**
   * บันทึกค่า Settings (Upsert: ถ้ามีให้อัปเดต ถ้าไม่มีให้สร้างใหม่)
   */
  async updateSettings(newSettings: SystemSettings): Promise<boolean> {
    try {
      // ใช้ Transaction เพื่อความปลอดภัย
      await sql.begin(async sql => {
        for (const [key, value] of Object.entries(newSettings)) {
            if (value === undefined || value === null) continue;

            // แปลงค่าเป็น String ก่อนเก็บลง DB
            const valueStr = String(value)

            // Upsert Query (Postgres)
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
      
      return true
    } catch (error) {
      console.error('❌ Update Settings Failed:', error)
      throw error
    }
  }
}