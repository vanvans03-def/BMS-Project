import { sql } from '../db'

export interface CreateLogDto {
  user_name: string
  action_type: 'WRITE' | 'SETTING' | 'USER'
  target_name: string
  details: string
}

export const auditLogService = {
  /**
   * บันทึก Log ใหม่
   */
  async recordLog(log: CreateLogDto) {
    try {
      await sql`
        INSERT INTO audit_logs (user_name, action_type, target_name, details, timestamp)
        VALUES (${log.user_name}, ${log.action_type}, ${log.target_name}, ${log.details}, NOW())
      `
    } catch (error) {
      console.error('❌ Failed to record audit log:', error)
      // ไม่ throw error เพื่อไม่ให้กระทบ flow หลัก (เช่น สั่งเปิดไฟได้ แต่ log พัง ไฟก็ควรเปิดติด)
    }
  },

  /**
   * ดึง Logs ทั้งหมด (รองรับ Filter ในอนาคต)
   */
  async getLogs(limit = 50) {
    return await sql`
      SELECT * FROM audit_logs 
      ORDER BY timestamp DESC 
      LIMIT ${limit}
    `
  }
}