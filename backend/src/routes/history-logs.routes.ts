import { Elysia, t } from 'elysia'
import { sql } from '../db'
import { historyReportService } from '../services/history-report.service'

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
    .get('/report/hourly', async ({ query }) => {
        const { startDate, endDate } = query

        if (!startDate || !endDate) {
            throw new Error('startDate and endDate are required')
        }

        const report = await historyReportService.getHourlyReportOptimized(startDate, endDate)
        return [...report]
    }, {
        query: t.Object({
            startDate: t.String(),
            endDate: t.String()
        })
    })
    .get('/tables', async () => {
        const tables = await sql`
            SELECT 
                p.report_table_name as table_name,
                d.device_name,
                p.point_name
            FROM points p
            JOIN devices d ON p.device_id = d.id
            WHERE p.report_table_name IS NOT NULL
            ORDER BY d.device_name, p.point_name
        `
        // Serialize explicitly to plain objects to avoid [object Object] issues
        return tables.map(row => ({
            table_name: row.table_name,
            device_name: row.device_name,
            point_name: row.point_name
        }))
    })
    .get('/table/:tableName', async ({ params, query }) => {
        const { tableName } = params
        const page = Number(query.page) || 1
        const limit = Number(query.limit) || 20
        const offset = (page - 1) * limit
        const startDate = query.startDate ? new Date(query.startDate as string) : null
        const endDate = query.endDate ? new Date(query.endDate as string) : null

        // Validate table name to prevent SQL injection (basic check)
        // Ideally checking against known tables or using strict regex
        if (!/^table_[a-z0-9_]+$/.test(tableName)) {
            throw new Error('Invalid table name')
        }

        const conditions = []
        if (startDate) conditions.push(sql`timestamp >= ${startDate}`)
        if (endDate) conditions.push(sql`timestamp <= ${endDate}`)

        const whereClause = conditions.length
            ? sql`WHERE ${conditions.reduce((acc, curr, i) => i === 0 ? curr : sql`${acc} AND ${curr}`)}`
            : sql``

        // Get total count
        // Using sql.unsafe because table name is dynamic
        const countQuery = sql`SELECT COUNT(*) as total FROM ${sql(tableName)} ${whereClause}`
        const countResult = await countQuery
        const total = Number(countResult[0]?.total || 0)

        // Get data
        const dataQuery = sql`
            SELECT timestamp, value, quality_code
            FROM ${sql(tableName)}
            ${whereClause}
            ORDER BY timestamp DESC
            LIMIT ${limit} OFFSET ${offset}
        `
        const logs = await dataQuery

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
            startDate: t.Optional(t.String()),
            endDate: t.Optional(t.String())
        })
    })
    .post('/query', async ({ body }) => {
        const { tables, startDate, endDate } = body

        if (!Array.isArray(tables) || tables.length === 0) {
            throw new Error('Tables array is required')
        }

        const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000) // Default 24h
        const end = endDate ? new Date(endDate) : new Date()

        // Validate table names
        for (const tableName of tables) {
            if (!/^table_[a-z0-9_]+$/.test(tableName)) {
                throw new Error(`Invalid table name: ${tableName}`)
            }
        }

        const results = await Promise.all(tables.map(async (tableName) => {
            const logs = await sql`
                SELECT timestamp, value
                FROM ${sql(tableName)}
                WHERE timestamp >= ${start} AND timestamp <= ${end}
                ORDER BY timestamp ASC
            `
            return {
                tableName,
                data: logs.map(l => ({
                    timestamp: l.timestamp,
                    value: l.value
                }))
            }
        }))

        return results
    }, {
        body: t.Object({
            tables: t.Array(t.String()),
            startDate: t.Optional(t.String()),
            endDate: t.Optional(t.String())
        })
    })
