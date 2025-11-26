/* eslint-disable react-refresh/only-export-components */
// frontend/src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { message } from 'antd'
import { config } from '../config'

interface User {
  id: number
  username: string
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ✅ ตรวจสอบ Token เมื่อโหลดครั้งแรก
  useEffect(() => {
    const savedToken = localStorage.getItem('bms_token')
    if (savedToken) {
      setToken(savedToken)
      verifyToken(savedToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  // ✅ ตรวจสอบความถูกต้องของ Token
  const verifyToken = async (tokenToVerify: string) => {
    try {
      // ลองเรียก API ที่ต้องใช้ Token (เช่น GET /users)
      const res = await fetch(`${config.apiUrl}/users`, {
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`
        }
      })

      if (res.ok) {
        // Token ยังใช้ได้ - Decode เพื่อเอา User Info (ถ้ามี)
        const payload = JSON.parse(atob(tokenToVerify.split('.')[1]))
        setUser({
          id: payload.id,
          username: payload.username,
          role: payload.role
        })
      } else {
        // Token หมดอายุหรือไม่ถูกต้อง
        handleInvalidToken()
      }
    } catch (error) {
      console.error('Token verification failed:', error)
      handleInvalidToken()
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ Login Function
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${config.apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await res.json()

      if (res.ok && data.success && data.token) {
        // บันทึก Token
        localStorage.setItem('bms_token', data.token)
        setToken(data.token)

        // Decode Token เพื่อเอา User Info
        const payload = JSON.parse(atob(data.token.split('.')[1]))
        setUser({
          id: payload.id,
          username: payload.username,
          role: payload.role
        })

        message.success(`Welcome back, ${payload.username}!`)
        return true
      } else {
        message.error(data.message || 'Invalid username or password')
        return false
      }
    } catch (error) {
      console.error('Login error:', error)
      message.error('Connection error. Please try again.')
      return false
    }
  }

  // ✅ Logout Function
  const logout = () => {
    localStorage.removeItem('bms_token')
    setToken(null)
    setUser(null)
    message.info('You have been logged out')
  }

  // ✅ ตรวจสอบสถานะ Auth
  const checkAuth = async (): Promise<boolean> => {
    const savedToken = localStorage.getItem('bms_token')
    if (!savedToken) return false

    try {
      const res = await fetch(`${config.apiUrl}/users`, {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      })
      return res.ok
    } catch {
      return false
    }
  }

  // ✅ จัดการ Token ที่ไม่ถูกต้อง
  const handleInvalidToken = () => {
    localStorage.removeItem('bms_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ✅ Custom Hook
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}