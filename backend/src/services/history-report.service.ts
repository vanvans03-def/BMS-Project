import { sql } from '../db'
import { locationsService } from './locations.service'

export interface ReportRow {
    no: number
    source: string // 'Main' | 'Record'
    configuration: string // 'Hourly' | 'Daily' | 'Weekly' | 'Monthly'
    unit: string
    activate_date: string // DD-MMM-YYYY
    table_name: string
    mark: string
    type_cabinet: string
    zone: string
    panel: string
    cb: string
    floor: string
    phase: string
    room: string
    value: number
}

interface LocationNode {
    id: number
    parent_id: number | null
    name: string
    type: string
}

export const historyReportService = {
    // Helper to resolve location hierarchy for a device
    async getLocationContext(locationId: number | null, allLocations: LocationNode[]) {
        const context = {
            floor: '',
            zone: '',
            panel: '',
            type_cabinet: '',
            room: '',
            cb: '',
            phase: ''
        }

        if (!locationId) return context

        let currentId: number | null = locationId

        // Safety break to prevent infinite loops
        let depth = 0
        const maxDepth = 20

        while (currentId !== null && depth < maxDepth) {
            const loc = allLocations.find(l => l.id === currentId)
            if (!loc) break

            const type = loc.type.toUpperCase()
            const name = loc.name

            // Map based on type
            if (type === 'FLOOR') context.floor = name
            else if (type === 'ZONE') context.zone = name
            else if (type === 'PANEL') context.panel = name
            else if (type === 'CABINET' || type === 'PDU') context.type_cabinet = name
            else if (type === 'ROOM') context.room = name
            else if (type === 'CB' || type === 'CIRCUIT_BREAKER') context.cb = name
            else if (type === 'PHASE') context.phase = name

            currentId = loc.parent_id
            depth++
        }

        return context
    },

    async getReportData(startDate: string, endDate: string) {
        // 1. Fetch History Logs with Join
        // We strictly select "Record" type data implies history logs
        const logs = await sql`
      SELECT 
        hl.id,
        hl.value,
        hl.timestamp,
        p.unit,
        p.report_table_name,
        p.point_mark,
        d.device_name,
        d.location_id
      FROM history_logs hl
      JOIN points p ON hl.point_id = p.id
      JOIN devices d ON hl.device_id = d.id
      WHERE hl.timestamp BETWEEN ${startDate} AND ${endDate}
      ORDER BY hl.timestamp ASC
    `

        // 2. Fetch all locations for hierarchy traversal (Client-side join for flexibility)
        const allLocations = await locationsService.getAllLocations() as LocationNode[]

        // 3. Map to Report Format
        const reportData: ReportRow[] = []

        for (let i = 0; i < logs.length; i++) {
            const row = logs[i]
            if (!row) continue

            // Resolve Hierarchy
            const locContext = await this.getLocationContext(row.location_id, allLocations)

            // Format Date (Simple formatter or use library if needed, sticking to native for now)
            const dateObj = new Date(row.timestamp)
            const dateStr = dateObj.toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric'
            }).replace(/ /g, '-') // 01-Jan-2026

            reportData.push({
                no: i + 1,
                source: 'Record', // Defaulting to Record for history logs
                configuration: 'Hourly', // Defaulting as per common case
                unit: row.unit || '',
                activate_date: dateStr,
                table_name: row.report_table_name || '',
                mark: row.point_mark || '',
                type_cabinet: locContext.type_cabinet,
                zone: locContext.zone,
                panel: locContext.panel,
                cb: locContext.cb || row.device_name, // Fallback to device name if CB not in location
                floor: locContext.floor,
                phase: locContext.phase,
                room: locContext.room,
                value: row.value
            })
        }

        return reportData
    },

    /**
     * Optimized Report Data (Low Code Ready)
     * Uses Materialized View for instant aggregation and flat hierarchy.
     */
    async getHourlyReportOptimized(startDate: string, endDate: string) {
        console.time('report-optimized')
        const rows = await sql`
            SELECT 
                row_number() OVER (ORDER BY time_bucket ASC) as no,
                'Record' as source,
                'Hourly' as configuration,
                unit,
                
                -- Format date to DD-MMM-YYYY
                to_char(time_bucket, 'DD-Mon-YYYY') as activate_date,
                
                point_name as mark, -- mapping point_name to mark
                type_cabinet,
                zone,
                panel,
                device_name as cb, -- or panel?
                floor,
                '' as phase, -- phase not yet in view
                room,
                avg_value as value
            FROM mv_history_hourly
            WHERE time_bucket BETWEEN ${startDate} AND ${endDate}
            ORDER BY time_bucket ASC
        `
        console.timeEnd('report-optimized')
        return rows
    }
}
