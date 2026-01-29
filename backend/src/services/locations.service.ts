import { sql } from '../db'
import type { CreateLocationPayload, UpdateLocationPayload } from '../dtos/locations.dto'

export const locationsService = {
    // Get all locations (flat list for now, tree construction can happen here or frontend)
    async getAllLocations() {
        const result = await sql`SELECT * FROM locations ORDER BY id ASC`
        return [...result]
    },

    // Create a new location
    async createLocation(data: CreateLocationPayload) {
        const [newItem] = await sql`
      INSERT INTO locations (parent_id, name, type, description)
      VALUES (${data.parent_id || null}, ${data.name}, ${data.type}, ${data.description || null})
      RETURNING *
    `
        return newItem
    },

    // Update a location
    async updateLocation(id: number, data: UpdateLocationPayload) {
        const updates: any = {}
        if (data.parent_id !== undefined) updates.parent_id = data.parent_id
        if (data.name !== undefined) updates.name = data.name
        if (data.type !== undefined) updates.type = data.type
        if (data.description !== undefined) updates.description = data.description

        if (Object.keys(updates).length === 0) return { success: true }

        const [updated] = await sql`
      UPDATE locations SET ${sql(updates)} WHERE id = ${id} RETURNING *
    `
        return updated
    },

    // Delete a location (Cascading)
    async deleteLocation(id: number) {
        // Recursive delete children first
        const children = await sql`SELECT id FROM locations WHERE parent_id = ${id}`
        for (const child of children) {
            await this.deleteLocation(child.id)
        }

        // Unlink devices (set location_id to null) or Delete them? User said "folder root... internal folder must be deleted".
        // Usually devices are physical, so we just unlink them. But user said "root... inside folder must be deleted".
        // If strictly following "folder structure", we delete folders.
        // For devices, unlinking is safer to avoid losing device configs.
        await sql`UPDATE devices SET location_id = NULL WHERE location_id = ${id}`
        await sql`UPDATE points SET location_id = NULL WHERE location_id = ${id}`

        await sql`DELETE FROM locations WHERE id = ${id}`
        return { success: true }
    },

    // Recursive Copy
    async copyLocation(sourceId: number, targetParentId: number | null) {
        // 1. Get Source
        const [source] = await sql`SELECT * FROM locations WHERE id = ${sourceId}`
        if (!source) throw new Error('Source location not found')

        // 2. Generate New Name
        // Check conflicts in target parent
        let newName = source.name
        let counter = 1

        // Simple loop to find unique name
        // "A" -> "A 1", "A 2"
        while (true) {
            const [existing] = await sql`
                SELECT id FROM locations 
                WHERE parent_id ${targetParentId ? sql`= ${targetParentId}` : sql`IS NULL`} 
                AND name = ${newName}
            `
            if (!existing) break
            newName = `${source.name} ${counter}`
            counter++
        }

        // 3. Create Copy
        const [newLocation] = await sql`
            INSERT INTO locations (parent_id, name, type, description)
            VALUES (${targetParentId || null}, ${newName}, ${source.type}, ${source.description})
            RETURNING *
        `

        // 4. Recursive Copy Children
        const children = await sql`SELECT id FROM locations WHERE parent_id = ${sourceId}`
        for (const child of children) {
            await this.copyLocation(child.id, newLocation!.id) // No need to return promises here unless we want to wait fully
        }

        return newLocation
    }
}
