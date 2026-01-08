
import { historyLoggerService } from '../src/services/history-logger.service'
import { monitorService } from '../src/services/monitor.service'
import { sql } from '../src/db'

// Mock Monitor Service
const mockReadDevicePoints = (deviceId: number, val: number) => {
    return Promise.resolve({
        success: true,
        deviceId,
        deviceInstanceId: 100,
        count: 1,
        values: [
            {
                pointId: 999999, // Fake Point ID
                pointName: 'TEST_POINT',
                objectType: 'ANALOG_VALUE',
                instance: 1,
                value: val,
                status: 'ok',
                timestamp: new Date().toISOString()
            }
        ]
    })
}

async function runTest() {
    console.log('🧪 Starting History Logic Verification (COV)...')

    // 1. Setup Test Device
    // We don't strictly need a real device in DB if we mock the logic inside pollDevice, 
    // BUT pollDevice logs to DB, so referential integrity might fail if device/point doesn't exist.
    // So we need to insert a fake device and point.

    const TEST_DEVICE_ID = 999999
    const TEST_POINT_ID = 999999

    try {
        console.log('📝 Creating Test Data...')
        // Clean up first
        await sql`DELETE FROM history_logs WHERE point_id = ${TEST_POINT_ID}`
        await sql`DELETE FROM points WHERE id = ${TEST_POINT_ID}`
        await sql`DELETE FROM devices WHERE id = ${TEST_DEVICE_ID}`

        // Insert Device
        await sql`
            INSERT INTO devices (id, device_name, polling_interval, is_history_enabled, status, device_instance_id)
            VALUES (${TEST_DEVICE_ID}, 'TEST_DEVICE_COV', 5000, true, 'online', 999999)
        `
        // Insert Point
        await sql`
            INSERT INTO points (id, device_id, point_name, object_type, object_instance, is_monitor)
            VALUES (${TEST_POINT_ID}, ${TEST_DEVICE_ID}, 'TEST_POINT', 'ANALOG_VALUE', 1, true)
        `

        // 2. Test Step 1: Initial Value
        console.log('🔹 Step 1: Log Initial Warning (100)')
        monitorService.readDevicePoints = () => mockReadDevicePoints(TEST_DEVICE_ID, 100) as any
        await (historyLoggerService as any).pollDevice({ id: TEST_DEVICE_ID, device_name: 'TEST', polling_interval: 5000 }, Date.now())

        const count1 = await getLogCount(TEST_POINT_ID)
        console.log(`   Logs count: ${count1} (Expected 1)`)
        if (count1 !== 1) throw new Error('Step 1 Failed')

        // 3. Test Step 2: Same Value (Should Skip)
        console.log('🔹 Step 2: Log Same Value (100) -> Should Skip')
        await (historyLoggerService as any).pollDevice({ id: TEST_DEVICE_ID, device_name: 'TEST', polling_interval: 5000 }, Date.now() + 5000)

        const count2 = await getLogCount(TEST_POINT_ID)
        console.log(`   Logs count: ${count2} (Expected 1)`)
        if (count2 !== 1) throw new Error('Step 2 Failed: Duplicate log found')

        // 4. Test Step 3: Small Change (100.2) -> 0.2% (Should Skip, Deadband 0.5%)
        console.log('🔹 Step 3: Log Small Change (100.2) -> Should Skip (Deadband)')
        monitorService.readDevicePoints = () => mockReadDevicePoints(TEST_DEVICE_ID, 100.2) as any
        await (historyLoggerService as any).pollDevice({ id: TEST_DEVICE_ID, device_name: 'TEST', polling_interval: 5000 }, Date.now() + 10000)

        const count3 = await getLogCount(TEST_POINT_ID)
        console.log(`   Logs count: ${count3} (Expected 1)`)
        if (count3 !== 1) throw new Error('Step 3 Failed: Deadband ignored')

        // 5. Test Step 4: Big Change (101) -> 1% (Should Log)
        console.log('🔹 Step 4: Log Big Change (101) -> Should Log')
        monitorService.readDevicePoints = () => mockReadDevicePoints(TEST_DEVICE_ID, 101) as any
        await (historyLoggerService as any).pollDevice({ id: TEST_DEVICE_ID, device_name: 'TEST', polling_interval: 5000 }, Date.now() + 15000)

        const count4 = await getLogCount(TEST_POINT_ID)
        console.log(`   Logs count: ${count4} (Expected 2)`)
        if (count4 !== 2) throw new Error('Step 4 Failed: Change not logged')

        console.log('✅ TEST PASSED: COV Logic is working correctly.')

    } catch (err) {
        console.error('❌ TEST FAILED:', err)
    } finally {
        console.log('🧹 Cleanup...')
        await sql`DELETE FROM history_logs WHERE point_id = ${TEST_POINT_ID}`
        await sql`DELETE FROM points WHERE id = ${TEST_POINT_ID}`
        await sql`DELETE FROM devices WHERE id = ${TEST_DEVICE_ID}`
        process.exit(0)
    }
}

async function getLogCount(pointId: number) {
    const res = await sql`SELECT count(*) as c FROM history_logs WHERE point_id = ${pointId}`
    return Number(res[0]?.c || 0)
}

runTest()
