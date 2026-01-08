import { sql } from '../src/db';
import { monitorService } from '../src/services/monitor.service';

async function debug() {
    const instanceId = 1234;
    console.log(`🔍 Debugging Device with Instance ID: ${instanceId}`);

    // 1. Find Device ID
    const [device] = await sql`SELECT * FROM devices WHERE device_instance_id = ${instanceId}`;
    if (!device) {
        console.error('❌ Device not found!');
        process.exit(1);
    }
    console.log(`✅ Found Device: ID=${device.id} Name=${device.device_name} Protocol=${device.protocol}`);
    console.log(`   History Enabled: ${device.is_history_enabled}, Interval: ${device.polling_interval}`);

    // 2. Check Points
    const points = await sql`SELECT count(*) FROM points WHERE device_id = ${device.id}`;
    const monitoredPoints = await sql`SELECT count(*) FROM points WHERE device_id = ${device.id} AND is_monitor = true`;

    console.log(`📊 Total Points: ${points[0]?.count ?? 0}`);
    console.log(`👀 Monitored Points: ${monitoredPoints[0]?.count ?? 0}`);

    if (Number(monitoredPoints[0]?.count ?? 0) === 0) {
        console.warn('⚠️ No monitored points found! History logger will skip this device.');
        console.log('   (Did you forget to discover points or set is_monitor=true?)');
    }

    // 3. Try Read
    console.log('🔄 Attempting readDevicePoints...');
    try {
        const result = await monitorService.readDevicePoints(device.id);
        console.log('👉 Read Result:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('❌ Read failed:', err);
    }

    process.exit(0);
}

debug().catch(console.error);
