import { Elysia, t } from 'elysia'
import { usersService } from '../services/users.service'

export const usersRoutes = new Elysia({ prefix: '/users' })

  // 1. GET /users - ดึงรายชื่อ Users ทั้งหมด
  .get('/', async () => {
    return await usersService.getAllUsers()
  })

  // 2. POST /users - สร้าง User ใหม่
  .post('/', async ({ body }) => {
    const newUser = await usersService.createUser(body)
    return { success: true, user: newUser }
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String(),
      role: t.String(),
      email: t.Optional(t.String())
    })
  })

  // 3. PUT /users/:id - แก้ไข User
  .put('/:id', async ({ params: { id }, body }) => {
    const updated = await usersService.updateUser(Number(id), body)
    return { success: true, user: updated }
  }, {
    body: t.Object({
      username: t.Optional(t.String()),
      password: t.Optional(t.String()),
      role: t.Optional(t.String()),
      email: t.Optional(t.String()),
      is_active: t.Optional(t.Boolean())
    })
  })

  // 4. DELETE /users/:id - ลบ User
  .delete('/:id', async ({ params: { id } }) => {
    await usersService.deleteUser(Number(id))
    return { success: true, message: 'User deleted successfully' }
  })