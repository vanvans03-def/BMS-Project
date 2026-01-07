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

    // Delete a location
    async deleteLocation(id: number) {
        // Check for children
        const children = await sql`SELECT id FROM locations WHERE parent_id = ${id}`
        if (children.length > 0) {
            throw new Error('Cannot delete location with children. Delete children first.')
        }
        // Check for linked devices
        const devices = await sql`SELECT id FROM devices WHERE location_id = ${id}`
        if (devices.length > 0) {
            // Option: Set location_id to null for these devices, or block deletion.
            // For safety, let's block for now.
            throw new Error('Cannot delete location with assigned devices. Unassign devices first.')
        }

        await sql`DELETE FROM locations WHERE id = ${id}`
        return { success: true }
    }
}
