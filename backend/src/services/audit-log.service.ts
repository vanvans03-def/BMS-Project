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

      // Resolve user_name to id if userId is missing
      if (!uid && entry.user_name) {
        const users = await sql`SELECT id FROM users WHERE username = ${entry.user_name}`
        if (users.length > 0) uid = users[0]!.id
      }

      // If still no uid, maybe system action? or default to null?
      // Table expects integer, maybe nullable? Migration 13 says user_id INTEGER REFERENCES users(id). 
      // If we can't find user, we might fail constraint. 
      // Let's check if nullable. Usually yes unless NOT NULL specified. Migration 13 didn't say NOT NULL for user_id.

      await sql`
        INSERT INTO audit_logs (user_id, action, target, protocol, details, ip_address)
        VALUES (${uid || null}, ${action}, ${target || null}, ${entry.protocol || null}, ${details || null}, ${entry.ipAddress || null})
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
          l.created_at as timestamp,
          u.username as user_name,
          l.action as action_type,
          l.target as target_name,
          l.details,
          l.protocol
        FROM audit_logs l
        LEFT JOIN users u ON l.user_id = u.id
        WHERE 1 = 1
        ${search ? sql`AND (l.target ILIKE ${`%${search}%`} OR l.details::text ILIKE ${`%${search}%`})` : sql``}
        ${actionType ? sql`AND l.action = ${actionType}` : sql``}
        ${user ? sql`AND u.username = ${user}` : sql``}
        ${protocols ? sql`AND l.protocol IN ${sql(protocols.split(','))}` : sql``}
        ${startDate ? sql`AND l.created_at >= ${startDate}` : sql``}
        ${endDate ? sql`AND l.created_at <= ${endDate}` : sql``}
        ORDER BY l.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `

      return Array.isArray(result) ? [...result] : []
    } catch (error) {
      console.error('❌ Failed to fetch audit logs:', error)
      return []
    }
  }
}