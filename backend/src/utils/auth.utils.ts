import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback'

/**
 * ดึงชื่อผู้ใช้งาน (username) จาก JWT Token ที่อยู่ใน Header Authorization
 * @param request Request object จาก Elysia
 * @returns username หรือ 'Unknown User' ถ้าหาไม่เจอ
 */
export const getActorName = (request: Request): string => {
    try {
        const authHeader = request.headers.get('Authorization')
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
        
        if (!token) return 'Unknown User'
        
        const decoded = jwt.verify(token, JWT_SECRET) as any
        return decoded.username || 'Unknown User'
    } catch (error) {
        return 'Unknown User'
    }
}