
import { historyTableService } from '../src/services/history-table.service'
import { sql } from '../src/db'

async function updateView() {
    console.log('🔄 Triggering Manual View Rebuild...')
    try {
        await historyTableService.rebuildExportView()
        console.log('✅ View rebuilt successfully.')
    } catch (err) {
        console.error('❌ Error rebuilding view:', err)
    } finally {
        process.exit(0)
    }
}

updateView()
