import { Elysia, t } from 'elysia'
import { authService } from '../services/auth.service'

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/login', async ({ body, set }) => {
    const { username, password } = body
    
    const token = await authService.login(username, password)
    
    if (token) {
      return { 
        success: true, 
        token, 
        message: 'Login successful' 
      }
    } else {
      set.status = 401
      return { 
        success: false, 
        message: 'Invalid username or password' 
      }
    }
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String()
    })
  })