export interface User {
  id?: number
  username: string
  password?: string
  role: string
  email?: string
  is_active?: boolean
  last_login?: string
  created_at?: string
}

export interface CreateUserDto {
  username: string
  password: string
  role: string
  email?: string
}

export interface UpdateUserDto {
  username?: string
  password?: string
  role?: string
  email?: string
  is_active?: boolean
}