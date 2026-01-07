import { Elysia, t } from 'elysia'
import { sql } from '../db'

export const historyLogRoutes = new Elysia({ prefix: '/api/history-logs' })
    .get('/', async ({ query }) => {
        const page = Number(query.page) || 1
        const limit = Number(query.limit) || 20
        const offset = (page - 1) * limit

        const deviceId = query.deviceId ? Number(query.deviceId) : null
        const startDate = query.startDate ? new Date(query.startDate as string) : null
        const endDate = query.endDate ? new Date(query.endDate as string) : null

        // Base query conditions
        const conditions = []

        if (deviceId) conditions.push(sql`d.id = ${deviceId}`)
        if (startDate) conditions.push(sql`hl.timestamp >= ${startDate}`)
        if (endDate) conditions.push(sql`hl.timestamp <= ${endDate}`)

        const whereClause = conditions.length
            ? sql`WHERE ${conditions.reduce((acc, curr, i) => i === 0 ? curr : sql`${acc} AND ${curr}`)}`
            : sql``

        // Get total count
        const countResult = await sql`
            SELECT COUNT(*) as total
            FROM history_logs hl
            JOIN points p ON hl.point_id = p.id
            JOIN devices d ON p.device_id = d.id
            ${whereClause}
        `
        const total = Number(countResult[0]?.total || 0)

        // Get data
        const logs = await sql`
            SELECT 
                hl.timestamp,
                hl.value,
                hl.quality_code,
                d.device_name,
                p.point_name,
                p.object_type,
                p.object_instance
            FROM history_logs hl
            JOIN points p ON hl.point_id = p.id
            JOIN devices d ON p.device_id = d.id
            ${whereClause}
            ORDER BY hl.timestamp DESC
            LIMIT ${limit} OFFSET ${offset}
        `

        return {
            data: logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        }
    }, {
        query: t.Object({
            page: t.Optional(t.String()),
            limit: t.Optional(t.String()),
            deviceId: t.Optional(t.String()),
            startDate: t.Optional(t.String()),
            endDate: t.Optional(t.String())
        })
    })
