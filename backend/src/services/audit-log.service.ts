import { sql } from '../db'

export interface AuditLogEntry {
  userId?: number
  action: string
  target?: string
  protocol?: string
  details?: any
  ipAddress?: string
  // Legacy support compatibility
  user_name?: string
  action_type?: string
  target_name?: string
}

export interface AuditLogFilters {
  search?: string
  actionType?: string
  startDate?: string
  endDate?: string
  user?: string
  protocols?: string
  limit?: number
  offset?: number
}

export const auditLogService = {
  /**
   * Log an event
   * Supports both new (userId) and legacy (user_name) args by resolving user if needed.
   */
  async log(entry: AuditLogEntry) {
    try {
      let uid = entry.userId
      const action = entry.action || entry.action_type || 'UNKNOWN'
      const target = entry.target || entry.target_name || ''
      const details = entry.details

      // Resolve userId to user_name if missing
      let username = entry.user_name
      if (!username && uid) {
        const users = await sql`SELECT username FROM users WHERE id = ${uid}`
        if (users.length > 0) username = users[0]!.username
      }

      await sql`
        INSERT INTO audit_logs (user_name, action_type, target_name, protocol, details, timestamp)
        VALUES (${username || 'SYSTEM'}, ${action}, ${target || null}, ${entry.protocol || null}, ${details || null}, NOW())
      `
    } catch (error) {
      console.error('❌ Failed to create audit log:', error)
    }
  },

  // Alias for compatibility with users.service.ts
  async recordLog(entry: any) {
    return this.log({
      ...entry,
      action: entry.action_type, // Map legacy field
      target: entry.target_name
    })
  },

  /**
   * Get audit logs with advanced filtering
   */
  async getLogs(filters: AuditLogFilters = {}) {
    let { search, actionType, startDate, endDate, user, protocols, limit = 100, offset = 0 } = filters

    // [FIX] Adjust endDate to include the full day
    if (endDate && endDate.length === 10) {
      endDate = `${endDate} 23:59:59.999`
    }

    try {
      const result = await sql`
        SELECT 
          l.id,
          l.timestamp,
          l.user_name,
          l.action_type,
          l.target_name,
          l.details,
          l.protocol
        FROM audit_logs l
        WHERE 1 = 1
        ${search ? sql`AND (l.target_name ILIKE ${`%${search}%`} OR l.details::text ILIKE ${`%${search}%`})` : sql``}
        ${actionType ? sql`AND l.action_type = ${actionType}` : sql``}
        ${user ? sql`AND l.user_name = ${user}` : sql``}
        ${protocols ? sql`AND l.protocol IN ${sql(protocols.split(','))}` : sql``}
        ${startDate ? sql`AND l.timestamp >= ${startDate}` : sql``}
        ${endDate ? sql`AND l.timestamp <= ${endDate}` : sql``}
        ORDER BY l.timestamp DESC
        LIMIT ${limit} OFFSET ${offset}
      `

      return Array.isArray(result) ? [...result] : []
    } catch (error) {
      console.error('❌ Failed to fetch audit logs:', error)
      return []
    }
  }
}