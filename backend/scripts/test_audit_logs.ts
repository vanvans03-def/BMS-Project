import { auditLogService } from '../src/services/audit-log.service';

async function testAuditLogs() {
    console.log('🧪 Testing Audit Logs API...\n');

    try {
        // Test 1: Get all logs
        console.log('1. Fetching all logs...');
        const allLogs = await auditLogService.getLogs({});
        console.log(`   ✅ Found ${allLogs.length} logs`);
        if (allLogs.length > 0) {
            console.log('   Sample:', allLogs[0]);
        }

        // Test 2: Get logs with protocol filter (this is where the bug is)
        console.log('\n2. Fetching logs with protocol filter (BACNET)...');
        const bacnetLogs = await auditLogService.getLogs({
            protocols: 'BACNET'
        });
        console.log(`   ✅ Found ${bacnetLogs.length} BACNET logs`);

        // Test 3: Get logs with multiple protocols
        console.log('\n3. Fetching logs with multiple protocols (BACNET,ALL)...');
        const multiProtocolLogs = await auditLogService.getLogs({
            protocols: 'BACNET,ALL'
        });
        console.log(`   ✅ Found ${multiProtocolLogs.length} logs`);

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        process.exit(0);
    }
}

testAuditLogs();
