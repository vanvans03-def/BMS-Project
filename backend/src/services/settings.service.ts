import { sql } from '../db'
import { auditLogService } from './audit-log.service'
import type { SystemSettings } from '../dtos/setting.dto'

export interface NetworkInterfaceDetail {
  name: string
  ip: string
  mac: string
  type: string
}

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

  async getNetworkInterfaces(): Promise<NetworkInterfaceDetail[]> {
    try {
      const os = await import('os')
      const interfaces = os.networkInterfaces()
      const results: NetworkInterfaceDetail[] = []

      for (const name of Object.keys(interfaces)) {
        const ifaces = interfaces[name]
        if (ifaces) {
          // Find IPv4 address
          const ipv4 = ifaces.find(iface => iface.family === 'IPv4' && !iface.internal)
          if (ipv4) {
            results.push({
              name,
              ip: ipv4.address,
              mac: ipv4.mac,
              type: 'IPv4'
            })
          } else {
            // If no IPv4, use first available (including loopback)
            const first = ifaces[0]
            if (first) {
              results.push({
                name,
                ip: first.address,
                mac: first.mac,
                type: first.family
              })
            }
          }
        }
      }

      return results
    } catch (error) {
      console.error('❌ Get Network Interfaces Failed:', error)
      return []
    }
  },

  // [MODIFIED] รับ userName เพื่อบันทึก Log
  async updateSettings(newSettings: SystemSettings, userName: string = 'Admin'): Promise<boolean> {
    try {
      // 1. บันทึกค่าลง DB (เหมือนเดิม)
      await sql.begin(async txn => {
        for (const [key, value] of Object.entries(newSettings)) {
          if (value === undefined || value === null) continue;
          const valueStr = String(value)
          await (txn as any)`
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