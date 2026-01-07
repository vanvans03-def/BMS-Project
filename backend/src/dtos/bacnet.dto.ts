// DTO สำหรับรับค่าจาก C# API (Discovery)
export interface BacnetNodeDto {
  address: string
  deviceId: number
}

// DTO สำหรับรับค่าจาก C# API (ObjectList)
export interface BacnetObjectIdDto {
  instant: number // ชื่อตาม Swagger (C# typo)
  type: string    // e.g. "OBJECT_ANALOG_INPUT"
  tag: string
}

// DTO สำหรับส่งคำสั่งอ่านค่า (Read Multiple Request)
export interface ReadRequestDto {
  deviceId: number
  instance: number
  objectType: string
  propertyId: string
}

// DTO ผลลัพธ์การอ่านค่า (Read Multiple Result)
export interface ReadResultDto {
  value: {
    value: any // ค่าที่ซ้อนอยู่ข้างใน
  }
  status: boolean
  deviceId: number
  instance: number
  objectType: string
  propertyId: string
}

// DTO สำหรับรับค่าเข้า API ของเราเอง (Frontend -> Backend)
// (แปลงชื่อให้สื่อความหมายถูกต้อง เช่น instant -> instance)
export interface BacnetPointDto {
  instance: number
  objectType: string
  name: string
}

export interface MonitorValueDto {
  deviceId: number
  objectType: string
  instance: number
  propertyId: string
  value: any
  status: boolean
}

// DTO สำหรับบันทึกอุปกรณ์ลง Database ของเรา
export interface CreateDeviceDto {
  device_name: string
  device_instance_id: number
  ip_address: string
  network_number?: number
  protocol?: string
  unit_id?: number
  polling_interval?: number | null

  location_id?: number
  is_history_enabled?: boolean
}

export interface CreatePointDto {
  device_id: number
  object_type: string
  object_instance: number
  point_name: string
}

export interface WriteRequestDto {
  deviceId: number
  objectType: string
  instance: number
  propertyId: string
  value: any
  priority?: number
}

export interface CreateDevicePayload {
  device_name: string
  device_instance_id: number // สำหรับ Modbus ใส่เป็น ID หลอกๆ หรือใช้ Auto Increment ก็ได้ แต่ BACnet ต้องใช้
  ip_address: string
  network_number?: number
  protocol?: 'BACNET' | 'MODBUS' // เพิ่ม Field นี้
  unit_id?: number               // เพิ่ม Field นี้
  polling_interval?: number | null

  location_id?: number
  is_history_enabled?: boolean
}