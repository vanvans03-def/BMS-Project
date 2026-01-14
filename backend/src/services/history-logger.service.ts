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
            // Fetch enabled devices
            const devices = await sql`
                SELECT id, device_name, polling_interval, logging_type
                FROM devices 
                WHERE is_history_enabled = true
            `
            const now = Date.now()

            for (const device of devices) {
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
        const loggingType = device.logging_type || 'COV' // Default to COV

        try {
            // 1. Fetch Point Metadata (Name & Table) for Table Resolution
            const pointsMeta = await sql`SELECT id, point_name, report_table_name FROM points WHERE device_id = ${device.id}`
            const pointMap = new Map<number, { name: string, tableName: string | null }>()
            pointsMeta.forEach(p => pointMap.set(p.id, { name: p.point_name, tableName: p.report_table_name }))

            // 2. Read Values
            const result = await monitorService.readDevicePoints(device.id)

            if (!result.success || !result.values.length) {
                await sql`UPDATE devices SET status = 'failed' WHERE id = ${device.id}`
                return
            }

            const validData = result.values.filter(v => v.status === 'ok' && v.value !== null)
            if (validData.length === 0) {
                await sql`UPDATE devices SET status = 'failed' WHERE id = ${device.id}`
                return
            }

            let logCount = 0

            for (const v of validData) {
                const pointId = v.pointId
                const meta = pointMap.get(pointId)
                if (!meta) continue

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
                        const loading = Math.abs(newValue - lastCache.value)
                        const percentChange = lastCache.value === 0
                            ? (newValue === 0 ? 0 : 100)
                            : (loading / Math.abs(lastCache.value)) * 100

                        if (percentChange >= this.DEADBAND_PERCENT) {
                            shouldLog = true
                        }
                    }
                }

                if (shouldLog) {
                    // DYNAMIC TABLE WRITE
                    let tableName = meta.tableName

                    // Lazy Provisioning: If table name missing, create it and update DB
                    if (!tableName) {
                        tableName = historyTableService.getTableName(device.device_name, meta.name)
                        await historyTableService.ensureTableExists(tableName)
                        await sql`UPDATE points SET report_table_name = ${tableName} WHERE id = ${pointId}`
                        // Update local map to avoid re-provisioning in same loop (though unlikely to loop same point twice)
                        meta.tableName = tableName
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
                console.log(`✅ [History] Logged ${logCount} points for ${device.device_name} (Dynamic Tables)`)
            }

            await sql`
                UPDATE devices 
                SET status = 'online', last_seen = NOW()
                WHERE id = ${device.id}
            `

        } catch (err) {
            console.error(`❌ [History] Failed to log ${device.device_name}:`, err)
            await sql`UPDATE devices SET status = 'failed' WHERE id = ${device.id}`
        }
    }
}

export const historyLoggerService = new HistoryLoggerService()
