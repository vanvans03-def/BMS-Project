import { sql } from '../db'
import { auditLogService } from './audit-log.service'

export const usersService = {
  /**
   * ดึง User ทั้งหมด
   */
  async getUsers() {
    const result = await sql`
      SELECT id, username, role, email, last_login, created_at 
      FROM users 
      ORDER BY id ASC
    `
    // Ensure return is a plain array
    return [...result]
  },

  /**
   * สร้าง User ใหม่ พร้อมเก็บ Log
   */
async createUser(body: { username: string; password?: string; role: string; email?: string; is_active?: boolean }, actor: string = 'Admin') {
    // [NEW] 1. ตรวจสอบ Username ซ้ำ
    const existingUser = await sql`SELECT id FROM users WHERE username = ${body.username}`
    if (existingUser.length > 0) {
        return { success: false, message: 'Username already exists' }
    }

    // [NEW] 2. ตรวจสอบ Email ซ้ำ (ถ้ามีการกรอก Email มา)
    if (body.email) {
        const existingEmail = await sql`SELECT id FROM users WHERE email = ${body.email}`
        if (existingEmail.length > 0) {
            return { success: false, message: 'Email already exists' }
        }
    }

    // 3. Hash Password (ถ้ามี)
    let hashedPassword = null
    if (body.password) {
        hashedPassword = await Bun.password.hash(body.password)
    }

    // 4. Insert ลง DB
    try {
        const [newUser] = await sql`
          INSERT INTO users (
            username, 
            password, 
            role, 
            email,
            is_active
          )
          VALUES (
            ${body.username}, 
            ${hashedPassword}, 
            ${body.role}, 
            ${body.email || null},
            ${body.is_active ?? true}
          )
          RETURNING id, username, role, email, created_at
        `

        // 5. ✅ บันทึก Audit Log
        if (newUser) {
          try {
            if (auditLogService && typeof auditLogService.recordLog === 'function') {
                await auditLogService.recordLog({
                    user_name: actor,
                    action_type: 'USER',
                    target_name: body.username, 
                    details: `Added new user '${body.username}' (Role: ${body.role})`
                })
            }
          } catch (logError) {
            console.error('⚠️ Failed to record audit log for create user:', logError)
          }
        }

        return newUser // ส่งคืน Object User ที่สร้างสำเร็จ (Frontend จะเช็คว่ามี id หรือ username ไหม)

    } catch (error) {
        console.error('Create user DB error:', error)
        // กรณีเกิด Error จาก DB (เช่น Unique Constraint ที่เราอาจดักไม่หมด)
        return { success: false, message: 'Database error: Could not create user' }
    }
  },

  /**
   * แก้ไข User (Edit)
   */
  async updateUser(id: number, body: { username?: string; password?: string; role?: string; email?: string; is_active?: boolean }, actor: string = 'Admin') {
    // 1. หา User เก่าก่อน
    const [oldUser] = await sql`SELECT * FROM users WHERE id = ${id}`
    if (!oldUser) return { success: false, message: 'User not found' }

    // 2. เตรียมข้อมูลที่จะอัปเดต
    const updates: any = {}
    if (body.username) updates.username = body.username
    if (body.role) updates.role = body.role
    if (body.email !== undefined) updates.email = body.email
    if (body.is_active !== undefined) updates.is_active = body.is_active
    
    if (body.password && body.password.trim() !== '') {
        updates.password = await Bun.password.hash(body.password)
    }

    // 3. อัปเดตลง DB
    const [updatedUser] = await sql`
        UPDATE users SET ${sql(updates)}
        WHERE id = ${id}
        RETURNING id, username, role, email, is_active
    `

    // 4. ✅ บันทึก Audit Log
    if (updatedUser) {
        try {
            if (auditLogService && typeof auditLogService.recordLog === 'function') {
                // สร้างข้อความ Log ว่าแก้อะไรบ้าง
                const changes = []
                if (body.role && body.role !== oldUser.role) changes.push(`Role: ${oldUser.role} -> ${body.role}`)
                if (body.email && body.email !== oldUser.email) changes.push(`Email updated`)
                if (body.is_active !== undefined && body.is_active !== oldUser.is_active) changes.push(`Active: ${oldUser.is_active} -> ${body.is_active}`)
                if (body.password) changes.push(`Password changed`)

                const details = changes.length > 0 ? changes.join(', ') : 'Updated info'

                await auditLogService.recordLog({
                    user_name: actor,
                    action_type: 'USER',
                    target_name: updatedUser.username, 
                    details: `Updated user '${updatedUser.username}': ${details}`
                })
            }
        } catch (logError) {
            console.error('⚠️ Failed to record audit log for update user:', logError)
        }
    }

    return { success: true, user: updatedUser }
  },

  /**
   * ลบ User พร้อมเก็บ Log
   */
  async deleteUser(id: number, actor: string = 'Admin') {
    // หาชื่อ User ก่อนลบ เพื่อเอาไปใส่ Log
    const [user] = await sql`SELECT username FROM users WHERE id = ${id}`
    
    if (!user) return { success: false, message: 'User not found' }

    // ลบ User
    await sql`DELETE FROM users WHERE id = ${id}`

    // ✅ บันทึก Audit Log
    try {
        if (auditLogService && typeof auditLogService.recordLog === 'function') {
            await auditLogService.recordLog({
                user_name: actor,
                action_type: 'USER',
                target_name: user.username,
                details: `Deleted user '${user.username}'`
            })
        }
    } catch (logError) {
        console.error('⚠️ Failed to record audit log for delete user:', logError)
    }

    return { success: true, message: `User ${user.username} deleted` }
  }
}