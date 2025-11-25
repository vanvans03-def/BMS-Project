import { sql } from '../db'
import type { SystemStats, BackupInfo } from '../dtos/database.dto'

export const databaseService = {
  /**
   * ดึงสถิติระบบทั้งหมด
   */
  async getSystemStats(): Promise<SystemStats> {
    try {
      // นับจำนวน Devices
      const [deviceCount] = await sql`
        SELECT COUNT(*) as count FROM devices
      `
      
      // นับจำนวน Active Devices
      const [activeDeviceCount] = await sql`
        SELECT COUNT(*) as count FROM devices WHERE is_active = true
      `
      
      // นับจำนวน Points
      const [pointCount] = await sql`
        SELECT COUNT(*) as count FROM points
      `
      
      // นับจำนวน Points ที่กำลัง Monitor
      const [monitoringCount] = await sql`
        SELECT COUNT(*) as count FROM points WHERE is_monitor = true
      `
      
      // นับจำนวน Users (ถ้ามี)
      let userCount = 0
      try {
        const [users] = await sql`SELECT COUNT(*) as count FROM users`
        userCount = users?.count ?? 0
      } catch {
        // ถ้าตาราง users ยังไม่มีก็ให้ return 0
        userCount = 0
      }

      // ขนาด Database (Postgres Specific)
      let dbSize = 'Unknown'
      try {
        const [size] = await sql`
          SELECT pg_size_pretty(pg_database_size(current_database())) as size
        `
        dbSize = size?.size ?? 'N/A'
      } catch {
        dbSize = 'N/A'
      }

      return {
        totalDevices: Number(deviceCount?.count ?? 0),
        totalPoints: Number(pointCount?.count ?? 0),
        totalUsers: Number(userCount),
        activeDevices: Number(activeDeviceCount?.count ?? 0),
        monitoringPoints: Number(monitoringCount?.count ?? 0),
        databaseSize: dbSize,
        lastBackup: new Date().toISOString() // Mock - ในโปรเจคจริงควรเก็บใน Config
      }
    } catch (error) {
      console.error('❌ Get System Stats Failed:', error)
      throw error
    }
  },

  /**
   * ลบข้อมูลทั้งหมด (Factory Reset)
   */
  async clearAllData(): Promise<void> {
    try {
      console.warn('⚠️ [DATABASE] Factory Reset - Deleting ALL data...')
      
      await sql.begin(async sql => {
        // ลบข้อมูลทั้งหมด (ระวัง!)
        await sql`DELETE FROM points`
        await sql`DELETE FROM devices`
        // ไม่ลบ Users เพื่อไม่ให้ Locked Out
        // await sql`DELETE FROM users` 
        await sql`DELETE FROM system_settings`
        
        console.log('✅ All data deleted successfully')
      })
    } catch (error) {
      console.error('❌ Clear All Data Failed:', error)
      throw error
    }
  },

  /**
   * ข้อมูล Backup (Mock)
   */
  async getBackupInfo(): Promise<BackupInfo> {
    return {
      lastBackup: new Date().toISOString(),
      backupSize: '2.3 MB',
      autoBackup: true,
      backupLocation: '/var/backups/bms'
    }
  },

  /**
   * Optimize Database
   */
  async optimizeDatabase(): Promise<void> {
    try {
      console.log('🔧 [DATABASE] Running VACUUM ANALYZE...')
      
      // ใช้ VACUUM ANALYZE เพื่อ Optimize (Postgres)
      // ⚠️ ไม่สามารถรัน VACUUM ใน Transaction ได้
      // ต้องใช้ unsafe query
      await sql.unsafe('VACUUM ANALYZE')
      
      console.log('✅ Database optimized')
    } catch (error) {
      console.error('❌ Optimize Failed:', error)
      throw error
    }
  }
}