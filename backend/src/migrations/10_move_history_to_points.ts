import { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    // 1. Add is_history_enabled to points
    await db.schema
        .alterTable('points')
        .addColumn('is_history_enabled', 'boolean', (col) => col.defaultTo(false))
        .execute()

    // 2. Drop is_history_enabled from devices
    await db.schema
        .alterTable('devices')
        .dropColumn('is_history_enabled')
        .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
    // Reverse: Add back to devices, remove from points
    await db.schema
        .alterTable('devices')
        .addColumn('is_history_enabled', 'boolean', (col) => col.defaultTo(false))
        .execute()

    await db.schema
        .alterTable('points')
        .dropColumn('is_history_enabled')
        .execute()
}
