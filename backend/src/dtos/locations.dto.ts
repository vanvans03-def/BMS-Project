import { t } from 'elysia'

export interface Location {
    id: number
    parent_id?: number | null
    name: string
    type: string
    description?: string
    created_at?: string
    children?: Location[] // For tree structure
}

export const CreateLocationDto = t.Object({
    parent_id: t.Optional(t.Nullable(t.Number())),
    name: t.String(),
    type: t.String(), // 'Building', 'Floor', 'Room', 'Folder'
    description: t.Optional(t.Nullable(t.String()))
})

export const UpdateLocationDto = t.Object({
    parent_id: t.Optional(t.Nullable(t.Number())),
    name: t.Optional(t.String()),
    type: t.Optional(t.String()),
    description: t.Optional(t.Nullable(t.String()))
})

export type CreateLocationPayload = typeof CreateLocationDto.static
export type UpdateLocationPayload = typeof UpdateLocationDto.static
