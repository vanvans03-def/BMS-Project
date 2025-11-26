import { config } from '../config'

export const authFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token')
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${config.apiUrl}${endpoint}`, {
    ...options,
    headers,
  })

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('token')
    window.location.reload()
    return response
  }

  return response
}