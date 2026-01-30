
import { up } from './src/migrations/11_add_logging_type'
import { sql } from './src/db'

async function run() {
    await up()
    process.exit(0)
}

run()
