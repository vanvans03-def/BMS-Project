import { sql } from '../db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = Bun.env.JWT_SECRET || 'fallback-secret'

export const authService = {
  /**
   * ตรวจสอบ Username/Password และคืนค่า Token
   */
  async login(username: string, password: string): Promise<string | null> {
    // 1. ค้นหา User
    const [user] = await sql`
      SELECT id, username, password, role 
      FROM users 
      WHERE username = ${username} AND is_active = true
    `

    if (!user) return null

    // 2. ตรวจสอบ Password (ใช้ Bun.password.verify ที่รองรับ Argon2 จากตอน Create User)
    const isMatch = await Bun.password.verify(password, user.password)
    if (!isMatch) return null

    // 3. สร้าง Token (แนบ id, role ไปด้วย)
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '1d' } // Token อายุ 1 วัน
    )

    return token
  },

  /**
   * ตรวจสอบความถูกต้องของ Token
   */
  verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET)
    } catch (error) {
      return null
    }
  }
}