// frontend/src/lib/eden.ts
import { treaty } from '@elysiajs/eden'
// อ้างอิง Type จาก Backend
import type { App } from '../../../backend/src/index' 

// ชี้ไปที่ Backend
export const api = treaty<App>(import.meta.env.VITE_API_URL || 'http://localhost:3000')