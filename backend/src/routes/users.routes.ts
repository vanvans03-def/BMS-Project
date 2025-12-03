import { Elysia, t } from 'elysia'
import { usersService } from '../services/users.service'
// [UPDATED] นำเข้า getActorName
import { getActorName } from '../utils/auth.utils'

export const usersRoutes = new Elysia({ prefix: '/users' })
  
  // GET /users - ดึงรายชื่อ
  .get('/', async () => {
    return await usersService.getUsers()
  })

  // POST /users - สร้างผู้ใช้ใหม่
  .post('/', async ({ body, request }) => {
    // [UPDATED] ใช้ฟังก์ชันกลางดึงชื่อ User
    const actor = getActorName(request)
    return await usersService.createUser(body, actor)
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String(),
      role: t.String(),
      email: t.Optional(t.String()),
      is_active: t.Optional(t.Boolean())
    })
  })

  // PUT /users/:id - แก้ไขผู้ใช้
  .put('/:id', async ({ params: { id }, body, request }) => {
    const actor = getActorName(request)
    return await usersService.updateUser(Number(id), body, actor)
  }, {
    body: t.Object({
      username: t.Optional(t.String()),
      password: t.Optional(t.String()), 
      role: t.Optional(t.String()),
      email: t.Optional(t.String()),
      is_active: t.Optional(t.Boolean())
    })
  })

  // DELETE /users/:id - ลบผู้ใช้
  .delete('/:id', async ({ params: { id }, request }) => {
    const actor = getActorName(request)
    return await usersService.deleteUser(Number(id), actor)
  })