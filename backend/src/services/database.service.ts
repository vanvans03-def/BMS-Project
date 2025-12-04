import { sql } from '../db'
import type { SystemStats, BackupInfo } from '../dtos/database.dto'

export const databaseService = {
  /**
   * ดึงสถิติระบบทั้งหมด
   */
  // [UPDATED] รับ parameter protocol (optional)
  async getSystemStats(protocol?: string): Promise<SystemStats> {
    try {
      // สร้างเงื่อนไข Filter
      const deviceFilter = protocol && protocol !== 'ALL' 
        ? sql`WHERE protocol = ${protocol}` 
        : sql``
        
      const activeDeviceFilter = protocol && protocol !== 'ALL'
        ? sql`WHERE is_active = true AND protocol = ${protocol}`
        : sql`WHERE is_active = true`

      // ต้อง Join Table เพื่อกรอง Point ตาม Protocol ของ Device
      const pointFilter = protocol && protocol !== 'ALL'
        ? sql`JOIN devices d ON p.device_id = d.id WHERE d.protocol = ${protocol}`
        : sql``

      const monitorFilter = protocol && protocol !== 'ALL'
        ? sql`JOIN devices d ON p.device_id = d.id WHERE p.is_monitor = true AND d.protocol = ${protocol}`
        : sql`WHERE p.is_monitor = true`

      // 1. นับ Devices
      const [deviceCount] = await sql`SELECT COUNT(*) as count FROM devices ${deviceFilter}`
      
      // 2. นับ Active Devices
      const [activeDeviceCount] = await sql`SELECT COUNT(*) as count FROM devices ${activeDeviceFilter}`
      
      // 3. นับ Points (ต้องใช้ alias p สำหรับ points)
      const [pointCount] = await sql`SELECT COUNT(*) as count FROM points p ${pointFilter}`
      
      // 4. นับ Monitoring Points
      const [monitoringCount] = await sql`SELECT COUNT(*) as count FROM points p ${monitorFilter}`
      
      return {
        totalDevices: Number(deviceCount?.count ?? 0),
        totalPoints: Number(pointCount?.count ?? 0),
        // ...
      } as any // cast type ชั่วคราวถ้าจำเป็น
    } catch (error) {
       // ... error handling
       throw error
    }
  },

  /**
   * [FIXED] ข้อมูล Backup (ใช้ขนาด DB จริงเป็นตัวอ้างอิง)
   */
  async getBackupInfo(): Promise<BackupInfo> {
    // อ่านขนาด DB จริงมาใช้เป็นขนาด Backup โดยประมาณ
    let backupSize = '0 B'
    try {
        const [size] = await sql`SELECT pg_size_pretty(pg_database_size(current_database())) as size`
        backupSize = size?.size ?? '0 B'
    } catch (e) {
        console.warn('Cannot get db size for backup info')
    }

    return {
      lastBackup: new Date().toISOString(), // ยังคงใช้วันปัจจุบัน เพราะยังไม่มีระบบไฟล์จริง
      backupSize: backupSize,               // ใช้ขนาดจริงจาก DB
      autoBackup: true,
      backupLocation: '/var/backups/bms'    // Mock Path
    }
  },

  async clearAllData(protocol: string = 'ALL'): Promise<void> {
    try {
      console.warn(`⚠️ [DATABASE] Clear Data Request. Protocol: ${protocol}`)
      await sql.begin(async sql => {
        if (protocol === 'BACNET') {
            await sql`DELETE FROM devices WHERE protocol = 'BACNET'`
        } else if (protocol === 'MODBUS') {
            await sql`DELETE FROM devices WHERE protocol = 'MODBUS'`
        } else {
            await sql`DELETE FROM points`
            await sql`DELETE FROM devices`
        }
      })
    } catch (error) {
      console.error('❌ Clear Data Failed:', error)
      throw error
    }
  },

  async optimizeDatabase(): Promise<void> {
    try {
      console.log('🔧 [DATABASE] Running VACUUM ANALYZE...')
      await sql.unsafe('VACUUM ANALYZE')
      console.log('✅ Database optimized')
    } catch (error) {
      console.error('❌ Optimize Failed:', error)
      throw error
    }
  }
}