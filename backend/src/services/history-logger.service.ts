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
            // [UPDATED] Select devices that have AT LEAST ONE point with history enabled
            const devicesToPoll = await sql`
                SELECT DISTINCT d.id, d.device_name, d.polling_interval, d.logging_type
                FROM devices d
                JOIN points p ON d.id = p.device_id
                WHERE p.is_history_enabled = true
                AND d.status != 'failed'
            `

            const now = Date.now()

            for (const device of devicesToPoll) {
                const interval = device.polling_interval || 60000
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
        const loggingType = device.logging_type || 'COV'

        try {
            // 1. Fetch Point Metadata - Only fetch points that have history enabled
            const pointsMeta = await sql`
                SELECT id, point_name, report_table_name, is_history_enabled 
                FROM points 
                WHERE device_id = ${device.id} AND is_history_enabled = true
            `

            if (pointsMeta.length === 0) return

            const pointMap = new Map<number, any>()
            pointsMeta.forEach(p => pointMap.set(p.id, p))

            // 2. Read Values
            const result = await monitorService.readDevicePoints(device.id)

            if (!result.success || !result.values.length) {
                // Don't mark as failed immediately if just read error, but maybe log warning
                // Keep old logic if needed, but here we just return
                return
            }

            const validData = result.values.filter((v: any) => v.status === 'ok' && v.value !== null)
            let logCount = 0

            for (const v of validData) {
                const pointId = v.pointId
                const meta = pointMap.get(pointId)

                // [CRITICAL] Skip if this specific point is not enabled for history
                if (!meta || !meta.is_history_enabled) continue

                const newValue = Number(v.value)
                const lastCache = this.pointCache.get(pointId)
                let shouldLog = false

                if (!lastCache) {
                    shouldLog = true
                } else if (loggingType === 'INTERVAL') {
                    shouldLog = true
                } else {
                    const timeDiff = timestamp - lastCache.timestamp
                    if (timeDiff >= this.MAX_INTERVAL_MS) {
                        shouldLog = true
                    } else {
                        const diff = Math.abs(newValue - lastCache.value)
                        const percentChange = lastCache.value === 0
                            ? (newValue === 0 ? 0 : 100)
                            : (diff / Math.abs(lastCache.value)) * 100

                        if (percentChange >= this.DEADBAND_PERCENT) {
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
                console.log(`✅ [History] Logged ${logCount} points for ${device.device_name}`)
            }

        } catch (err) {
            console.error(`❌ [History] Failed to log ${device.device_name}:`, err)
        }
    }
}

export const historyLoggerService = new HistoryLoggerService()
