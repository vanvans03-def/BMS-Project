import { Elysia, t } from 'elysia'
import { usersService } from '../services/users.service'

export const usersRoutes = new Elysia({ prefix: '/users' })
  
  // GET /users - ดึงรายชื่อ
  .get('/', async () => {
    return await usersService.getUsers()
  })

  // POST /users - สร้างผู้ใช้ใหม่
  .post('/', async ({ body }) => {
    // ในอนาคต actor ควรดึงจาก Token/Session
    return await usersService.createUser(body, 'Admin')
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String(),
      role: t.String(),
      email: t.Optional(t.String()),
      is_active: t.Optional(t.Boolean())
    })
  })

  // PUT /users/:id - แก้ไขผู้ใช้ [NEW]
  .put('/:id', async ({ params: { id }, body }) => {
    return await usersService.updateUser(Number(id), body, 'Admin')
  }, {
    body: t.Object({
      username: t.Optional(t.String()),
      password: t.Optional(t.String()), // ส่งมาเฉพาะตอนเปลี่ยน
      role: t.Optional(t.String()),
      email: t.Optional(t.String()),
      is_active: t.Optional(t.Boolean())
    })
  })

  // DELETE /users/:id - ลบผู้ใช้
  .delete('/:id', async ({ params: { id } }) => {
    return await usersService.deleteUser(Number(id), 'Admin')
  })