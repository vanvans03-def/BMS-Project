import { sql } from '../db'
import { monitorService } from './monitor.service'
import { historyTableService } from './history-table.service'

/**
 * Service to manage background history logging
 * Features:
 * - Per-device polling interval
 * - Independent scheduling
 * - Dynamic Table Writing (Table-Per-Point)
 */
class HistoryLoggerService {
    private intervalId: Timer | null = null
    private isRunning = false
    private readonly CHECK_INTERVAL_MS = 1000 // Check every second

    // deviceId -> last poll timestamp
    private lastPollMap = new Map<number, number>()

    // pointId -> { value: number, timestamp: number }
    private pointCache = new Map<number, { value: number, timestamp: number }>()

    private readonly DEADBAND_PERCENT = 0.5 // 0.5% change required to log
    private readonly MAX_INTERVAL_MS = 60 * 60 * 1000 // 1 Hour heartbeat

    /**
     * Start the history logging job
     */
    start() {
        if (this.intervalId) return console.log('⏳ [History] Logger already running')
        console.log('🚀 [History] Starting History Logger Service (Dynamic Tables)...')

        this.intervalId = setInterval(() => {
            this.runScheduler()
        }, this.CHECK_INTERVAL_MS)
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = null
            console.log('🛑 [History] Stopped History Logger')
        }
    }

    private async runScheduler() {
        if (this.isRunning) return
        this.isRunning = true

        try {
            // [UPDATED] Smart Scheduling
            // Calculate effective polling interval: MIN(DeviceDefault, PointSpecificIntervals)
            // If Point Interval is NULL, it falls back to Device Default.
            const devicesToPoll = await sql`
                SELECT 
                    d.id, d.device_name, 
                    d.polling_interval AS device_interval,
                    d.logging_type,
                    COALESCE(MIN(NULLIF(p.poll_interval, 0)), d.polling_interval) as effective_interval
                FROM devices d
                JOIN points p ON d.id = p.device_id
                WHERE p.is_history_enabled = true
                AND d.status != 'failed'
                GROUP BY d.id
            `

            const now = Date.now()

            for (const device of devicesToPoll) {
                // Use the fastest interval found or device default, clamped to reasonable min (e.g. 100ms)
                const interval = Math.max(100, device.effective_interval || 60000)
                const lastPoll = this.lastPollMap.get(device.id) || 0

                if (now - lastPoll >= interval) {
                    await this.pollDevice(device, now)
                }
            }

        } catch (err) {
            console.error('❌ [History] Scheduler Error:', err)
        } finally {
            this.isRunning = false
        }
    }

    private async pollDevice(device: any, timestamp: number) {
        this.lastPollMap.set(device.id, timestamp)

        try {
            // 1. Fetch Point Metadata with Polling Config
            const pointsMeta = await sql`
                SELECT 
                    id, point_name, report_table_name, is_history_enabled,
                    poll_mode, poll_interval, cov_tolerance
                FROM points 
                WHERE device_id = ${device.id} AND is_history_enabled = true
            `

            if (pointsMeta.length === 0) return

            const pointMap = new Map<number, any>()
            pointsMeta.forEach(p => pointMap.set(p.id, p))

            // 2. Read Values
            const result = await monitorService.readDevicePoints(device.id)

            if (!result.success || !result.values.length) {
                return
            }

            const validData = result.values.filter((v: any) => v.status === 'ok' && v.value !== null)
            let logCount = 0

            for (const v of validData) {
                const pointId = v.pointId
                const meta = pointMap.get(pointId)
                if (!meta) continue

                const newValue = Number(v.value)
                // Cache key includes pointId
                const lastCache = this.pointCache.get(pointId)

                let shouldLog = false

                // --- LOGIC: PER-POINT POLLING ---
                const mode = meta.poll_mode || 'POLL' // Default to POLL if not set (Migration default was POLL)

                if (!lastCache) {
                    shouldLog = true
                } else {
                    // 1. POLLING MODE
                    if (mode === 'POLL') {
                        // Use Point Interval OR Device Interval (fallback)
                        const interval = meta.poll_interval || device.device_interval || 60000
                        const timeDiff = timestamp - lastCache.timestamp

                        if (timeDiff >= interval) {
                            shouldLog = true
                        }
                    }
                    // 2. COV MODE
                    else if (mode === 'COV') {
                        // Tolerance: Use point config OR default 0.5 (or 0 for strict change)
                        // If cov_tolerance is null, we can default to 0.0 or 0.5. Let's use 0.0 (any change) if not specified? 
                        // Migration comment said: "Null = No tolerance / Exact match" -> implies 0.0
                        const tolerance = meta.cov_tolerance ?? 0.0

                        const diff = Math.abs(newValue - lastCache.value)

                        if (diff > tolerance) { // Strictly greater? or >=? Let's say > to avoid noise on float equality
                            shouldLog = true
                        }

                        // Heartbeat: Also log if too much time passed (e.g. 1 hour or specific interval)
                        // Use Point Interval as Heartbeat if set, else 1 Hour
                        const heartbeat = meta.poll_interval || this.MAX_INTERVAL_MS
                        if ((timestamp - lastCache.timestamp) >= heartbeat) {
                            shouldLog = true
                        }
                    }
                }

                if (shouldLog) {
                    let tableName = meta.report_table_name

                    if (!tableName) {
                        tableName = historyTableService.getTableName(device.device_name, meta.point_name)
                        await historyTableService.ensureTableExists(tableName)
                        await sql`UPDATE points SET report_table_name = ${tableName} WHERE id = ${pointId}`
                        meta.report_table_name = tableName
                    }

                    await sql`
                        INSERT INTO ${sql(tableName)} (value, timestamp, quality_code)
                        VALUES (${newValue}, ${new Date(timestamp)}, 'good')
                    `

                    this.pointCache.set(pointId, { value: newValue, timestamp })
                    logCount++
                }
            }

            if (logCount > 0) {
                // Low verbosity log
                // console.log(`✅ [History] Logged ${logCount} points for ${device.device_name}`)
            }

        } catch (err) {
            console.error(`❌ [History] Failed to log ${device.device_name}:`, err)
        }
    }
}

export const historyLoggerService = new HistoryLoggerService()
