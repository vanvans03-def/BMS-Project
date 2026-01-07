import { Elysia, t } from 'elysia'
import { locationsService } from '../services/locations.service'
import { CreateLocationDto, UpdateLocationDto } from '../dtos/locations.dto'

export const locationsRoutes = new Elysia({ prefix: '/locations' })
    .get('/', async () => {
        return await locationsService.getAllLocations()
    })
    .post('/', async ({ body }) => {
        return await locationsService.createLocation(body)
    }, {
        body: CreateLocationDto
    })
    .put('/:id', async ({ params, body }) => {
        return await locationsService.updateLocation(Number(params.id), body)
    }, {
        body: UpdateLocationDto
    })
    .delete('/:id', async ({ params }) => {
        try {
            return await locationsService.deleteLocation(Number(params.id))
        } catch (error: any) {
            return { success: false, message: error.message }
        }
    })
