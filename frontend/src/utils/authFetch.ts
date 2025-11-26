// frontend/src/utils/authFetch.ts
import { config } from '../config'

interface AuthFetchOptions extends RequestInit {
  skipAuth?: boolean
}

export const authFetch = async (
  endpoint: string, 
  options: AuthFetchOptions = {}
) => {
  const { skipAuth = false, ...fetchOptions } = options
  
  // ดึง Token จาก localStorage
  const token = localStorage.getItem('bms_token')
  
  // ✅ สร้าง Headers Object แบบถูกต้อง
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...fetchOptions.headers as Record<string, string>,
  })

  // เพิ่ม Authorization Header (ถ้าไม่ได้ skipAuth และมี Token)
  if (!skipAuth && token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  try {
    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    })

    // ✅ จัดการ Unauthorized (Token หมดอายุ/ไม่ถูกต้อง)
    if (response.status === 401 || response.status === 403) {
      console.warn('Unauthorized - Clearing token and redirecting to login')
      localStorage.removeItem('bms_token')
      
      // Reload หน้าเพื่อให้ไป Login (AuthContext จะจัดการ)
      window.location.reload()
    }

    return response
  } catch (error) {
    console.error('authFetch error:', error)
    throw error
  }
}

// ✅ Helper สำหรับ API ที่ไม่ต้อง Auth (เช่น Login)
export const publicFetch = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  return authFetch(endpoint, { ...options, skipAuth: true })
}