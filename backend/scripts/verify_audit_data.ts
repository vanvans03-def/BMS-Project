import { sql } from '../src/db';
import { auditLogService } from '../src/services/audit-log.service';

async function verifyAuditData() {
    console.log('🔍 Checking Audit Logs Data...');

    try {
        // 1. Direct SQL Check
        console.log('\n1. Direct SQL Query:');
        const count = await sql`SELECT count(*) FROM audit_logs`;
        console.log(`   Total records in DB: ${count[0].count}`);

        const lastLogs = await sql`
            SELECT id, action, target, protocol, created_at 
            FROM audit_logs 
            ORDER BY created_at DESC 
            LIMIT 5
        `;
        console.log('   Last 5 logs:', lastLogs);

        // 2. Service Check (Simulating API call)
        console.log('\n2. Testing auditLogService.getLogs():');
        console.log('   Querying with default params...');
        const serviceLogs = await auditLogService.getLogs({});
        console.log(`   Service returned ${serviceLogs.length} logs`);

        if (serviceLogs.length > 0) {
            console.log('   Sample log from service:', serviceLogs[0]);
        }

        console.log('\n3. Testing Specific Filter (BACNET)...');
        const bacnetLogs = await auditLogService.getLogs({ protocols: 'BACNET' });
        console.log(`   Service returned ${bacnetLogs.length} BACNET logs`);

    } catch (error) {
        console.error('❌ Error verifying data:', error);
    } finally {
        process.exit(0);
    }
}

verifyAuditData();
