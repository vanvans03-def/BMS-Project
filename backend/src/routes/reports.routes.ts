import { Elysia, t } from 'elysia'
import { historyReportService } from '../services/history-report.service'
import { subDays } from 'date-fns'

export const reportsRoutes = new Elysia({ prefix: '/api/reports' })
    .get('/history', async ({ query }) => {
        // Default to last 24 hours if not provided
        const now = new Date()
        const defaultStart = subDays(now, 1).toISOString()
        const defaultEnd = now.toISOString()

        const startDate = query.start || defaultStart
        const endDate = query.end || defaultEnd

        console.log(`📊 Generating Report: ${startDate} to ${endDate}`)

        try {
            const data = await historyReportService.getReportData(startDate, endDate)
            return {
                success: true,
                count: data.length,
                data: data
            }
        } catch (error) {
            console.error('Report Generation Error:', error)
            return {
                success: false,
                message: 'Failed to generate report',
                error: String(error)
            }
        }
    }, {
        query: t.Object({
            start: t.Optional(t.String()),
            end: t.Optional(t.String())
        })
    })
