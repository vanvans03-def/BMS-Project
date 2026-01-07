import { sql } from '../db'
import { monitorService } from './monitor.service'

/**
 * Service to manage background history logging
 * Features:
 * - Per-device polling interval
 * - Independent scheduling
 */
class HistoryLoggerService {
    private intervalId: Timer | null = null
    private isRunning = false
    private readonly CHECK_INTERVAL_MS = 1000 // Check every second
    private lastPollMap = new Map<number, number>() // deviceId -> timestamp

    /**
     * Start the history logging job
     */
    start() {
        if (this.intervalId) return console.log('⏳ [History] Logger already running')

        console.log('🚀 [History] Starting History Logger Service (Smart Scheduling)...')

        // Run loop
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

    /**
     * Scheduler Loop
     */
    private async runScheduler() {
        if (this.isRunning) return // Skip if previous run is dragging (rare for 1s tick, but safe)
        this.isRunning = true

        try {
            // 1. Get enabled devices (optimize: cache this or fetch only needed fields)
            // Fetching every second is fine for < 1000 devices on local DB.
            const devices = await sql`
                SELECT id, device_name, polling_interval 
                FROM devices 
                WHERE is_history_enabled = true
            `

            const now = Date.now()

            for (const device of devices) {
                const interval = device.polling_interval || 60000 // Default 60s
                const lastPoll = this.lastPollMap.get(device.id) || 0

                if (now - lastPoll >= interval) {
                    // Time to poll!
                    // Fire and forget (don't await) to let other devices process?
                    // OR await to ensure we don't overwhelm?
                    // Let's await for safety, but this means slow devices delay others.
                    // Ideally: Promise.all or independent async tasks. 
                    // detailed implementation:
                    this.pollDevice(device, now)
                }
            }

        } catch (err) {
            console.error('❌ [History] Scheduler Error:', err)
        } finally {
            this.isRunning = false
        }
    }

    private async pollDevice(device: any, timestamp: number) {
        // Update map immediately to prevent double-polling if this takes long
        this.lastPollMap.set(device.id, timestamp)

        try {
            // Read values
            const result = await monitorService.readDevicePoints(device.id)

            if (!result.success || !result.values.length) {
                // If read failed logically (e.g. connection error handled by monitor service)
                await sql`UPDATE devices SET status = 'failed' WHERE id = ${device.id}`
                return
            }

            const validData = result.values.filter(v => v.status === 'ok' && v.value !== null)
            if (validData.length === 0) {
                await sql`UPDATE devices SET status = 'failed' WHERE id = ${device.id}`
                return
            }

            const records = validData.map(v => ({
                device_id: device.id,
                point_id: v.pointId,
                value: Number(v.value),
                quality_code: 'good'
            }))

            await sql`INSERT INTO history_logs ${sql(records)}`

            // [NEW] Update Status = Online
            await sql`
                UPDATE devices 
                SET status = 'online', last_seen = NOW()
                WHERE id = ${device.id}
            `

            // Console log only occasionally or debug? Too spammy every 1s
            console.log(`✅ [History] Logged ${records.length} points for ${device.device_name} (Interval: ${device.polling_interval})`)

        } catch (err) {
            console.error(`❌ [History] Failed to log ${device.device_name}:`, err)
            // [NEW] Update Status = Failed
            await sql`UPDATE devices SET status = 'failed' WHERE id = ${device.id}`
        }
    }
}

export const historyLoggerService = new HistoryLoggerService()
