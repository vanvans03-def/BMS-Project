import { sql } from '../db'

export interface AuditLog {
  id?: number
  timestamp?: string
  user_name: string
  action_type: 'WRITE' | 'SETTING' | 'USER' | 'SYSTEM'
  target_name: string
  details: string
  protocol?: 'BACNET' | 'MODBUS' | 'ALL'
}

export const auditLogService = {
  /**
   * บันทึก Log ใหม่
   */
  async recordLog(log: AuditLog) {
    try {
      await sql`
        INSERT INTO audit_logs (user_name, action_type, target_name, details, protocol, timestamp)
        VALUES (
            ${log.user_name}, 
            ${log.action_type}, 
            ${log.target_name}, 
            ${log.details}, 
            ${log.protocol || 'ALL'},
            NOW()
        )
      `
    } catch (error) {
      console.error('❌ Failed to record audit log:', error)
    }
  },

  /**
   * ดึง Logs พร้อม Filter
   * [UPDATED] เพิ่ม protocols filter (array string)
   */
  async getLogs(filters: { 
    search?: string, 
    actionType?: string, 
    startDate?: string, 
    endDate?: string,
    user?: string,
    protocols?: string // รับเป็น string ขั้นด้วย comma เช่น "BACNET,ALL"
  }) {
    const conditions = []
    
    if (filters.search) {
      conditions.push(sql`(target_name ILIKE ${`%${filters.search}%`} OR details ILIKE ${`%${filters.search}%`})`)
    }
    
    if (filters.actionType && filters.actionType !== 'all') {
      const typeMap: Record<string, string> = {
        'write': 'WRITE',
        'setting': 'SETTING',
        'user': 'USER'
      }
      const dbType = typeMap[filters.actionType] || filters.actionType.toUpperCase()
      conditions.push(sql`action_type = ${dbType}`)
    }

    if (filters.user && filters.user !== 'all') {
        conditions.push(sql`user_name ILIKE ${filters.user}`)
    }

    // [UPDATED] Logic กรอง Protocol
    if (filters.protocols && filters.protocols !== 'all') {
        const protocolList = filters.protocols.split(',').map(p => p.trim().toUpperCase())
        if (protocolList.length > 0) {
            conditions.push(sql`protocol IN ${sql(protocolList)}`)
        }
    }

    if (filters.startDate && filters.endDate) {
       const start = new Date(filters.startDate).toISOString()
       const end = new Date(filters.endDate)
       end.setHours(23, 59, 59, 999)
       conditions.push(sql`timestamp BETWEEN ${start} AND ${end.toISOString()}`)
    }

    const whereClause = conditions.length > 0 
      ? sql`WHERE ${conditions.reduce((a, b) => sql`${a} AND ${b}`)}` 
      : sql``

    const result = await sql`
      SELECT * FROM audit_logs 
      ${whereClause}
      ORDER BY timestamp DESC 
      LIMIT 100
    `

    return [...result]
  }
}