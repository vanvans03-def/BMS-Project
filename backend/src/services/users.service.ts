import { sql } from '../db'
import type { User, CreateUserDto, UpdateUserDto } from '../dtos/user.dto'


export const usersService = {
  /**
   * ดึง Users ทั้งหมด (ไม่รวม password)
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const users = await sql`
        SELECT 
          id, 
          username, 
          role, 
          email, 
          is_active, 
          last_login,
          created_at
        FROM users 
        ORDER BY created_at DESC
      `
      
      return Array.from(users) as User[]
    } catch (error) {
      console.error('❌ Get Users Failed:', error)
      return []
    }
  },

  /**
   * สร้าง User ใหม่
   */
  async createUser(data: CreateUserDto): Promise<User | null> {
    try {
      // ⚠️ IMPORTANT: ในโปรเจคจริงต้อง Hash Password ด้วย bcrypt
      // ตอนนี้เก็บแบบ Plain Text เพื่อความง่าย (ไม่ปลอดภัย!)
      
      const [newUser] = await sql`
        INSERT INTO users (
          username, 
          password, 
          role, 
          email,
          is_active
        ) VALUES (
          ${data.username},
          ${data.password},
          ${data.role},
          ${data.email || null},
          true
        )
        RETURNING id, username, role, email, is_active, created_at
      `
      
      return newUser as User
    } catch (error) {
      console.error('❌ Create User Failed:', error)
      throw error
    }
  },

  /**
   * แก้ไข User
   */
  async updateUser(id: number, data: UpdateUserDto): Promise<User | null> {
    try {
      // สร้าง Dynamic Update Query
      const updates: string[] = []
      const values: any[] = []
      let paramIndex = 1

      if (data.username) {
        updates.push(`username = $${paramIndex++}`)
        values.push(data.username)
      }
      if (data.password) {
        // ⚠️ ในโปรเจคจริงต้อง Hash
        updates.push(`password = $${paramIndex++}`)
        values.push(data.password)
      }
      if (data.role) {
        updates.push(`role = $${paramIndex++}`)
        values.push(data.role)
      }
      if (data.email !== undefined) {
        updates.push(`email = $${paramIndex++}`)
        values.push(data.email)
      }
      if (data.is_active !== undefined) {
        updates.push(`is_active = $${paramIndex++}`)
        values.push(data.is_active)
      }

      updates.push(`updated_at = NOW()`)

      if (updates.length === 1) {
        // ไม่มีอะไรให้ Update (มีแค่ updated_at)
        return await this.getUserById(id)
      }

      values.push(id) // เพิ่ม id สำหรับ WHERE

      const query = `
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, username, role, email, is_active, updated_at
      `

      const [updated] = await sql.unsafe(query, values)
      
      return updated as unknown as User
    } catch (error) {
      console.error('❌ Update User Failed:', error)
      throw error
    }
  },

  /**
   * ลบ User
   */
  async deleteUser(id: number): Promise<boolean> {
    try {
      const result = await sql`
        DELETE FROM users WHERE id = ${id}
      `
      
      return result.count > 0
    } catch (error) {
      console.error('❌ Delete User Failed:', error)
      throw error
    }
  },

  /**
   * ดึง User ตาม ID
   */
  async getUserById(id: number): Promise<User | null> {
    try {
      const [user] = await sql`
        SELECT 
          id, username, role, email, is_active, last_login, created_at
        FROM users 
        WHERE id = ${id}
      `
      
      return (user as User) || null
    } catch (error) {
      console.error('❌ Get User Failed:', error)
      return null
    }
  }
}