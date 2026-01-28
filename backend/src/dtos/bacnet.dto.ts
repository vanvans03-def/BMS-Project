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
  ip?: string // [NEW] Added for native client
  deviceId: number
  instance: number
  objectType: number
  propertyId?: number // Optional?
}

// DTO ผลลัพธ์การอ่านค่า (Read Multiple Result)
export interface ReadResultDto {
  value: {
    value: any // ค่าที่ซ้อนอยู่ข้างใน
  }
  status: string // 'ok' | 'error'
  deviceId: number
  instance: number
  objectType: number
  propertyId: number
}

// DTO สำหรับรับค่าเข้า API ของเราเอง (Frontend -> Backend)
// (แปลงชื่อให้สื่อความหมายถูกต้อง เช่น instant -> instance)
export interface BacnetPointDto {
  instance: number
  objectType: string // [REVERTED] Changed back to string to support existing logic
  name: string
}

export interface MonitorValueDto {
  deviceId: number
  objectType: number
  instance: number
  propertyId: number
  value: any
  status: string
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
  object_type: number
  object_instance: number
  point_name: string
}

export interface WriteRequestDto {
  ip?: string // [NEW] Added for native client
  deviceId: number
  objectType: number
  instance: number
  propertyId: number
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

  // [NEW] Modbus & Hierarchy Fields
  device_type?: 'GATEWAY' | 'DEVICE'
  parent_id?: number | null
  connection_type?: 'TCP' | 'SERIAL'
  tcp_response_timeout?: number
  serial_port_name?: string
  serial_baud_rate?: number
  serial_data_bits?: number
  serial_stop_bits?: number
  serial_parity?: 'none' | 'even' | 'odd'
  byte_order_float?: string
  byte_order_long?: string
}

// ==========================================
// UNIVERSAL CONFIGURATION TYPES
// ==========================================

export enum UniversalType {
  BOOLEAN_R = 'BOOLEAN_R',
  BOOLEAN_W = 'BOOLEAN_W',
  NUMERIC_R = 'NUMERIC_R',
  NUMERIC_W = 'NUMERIC_W',
  STRING = 'STRING'
}

export interface BacnetDriverConfig {
  localDeviceId: number
  objectName: string
  networkNumber: number
  transport: {
    interface: string
    udpPort: string // HEX String e.g. "0xBAC0"
  }
  tuning: {
    apduTimeout: number
    retries: number
  }
}

export interface BacnetDeviceConfig {
  deviceId: number // Instance Number
  address: string  // IP Address
  communication: {
    segmentation: 'None' | 'Transmit' | 'Receive' | 'SegmentedBoth'
    maxApduLength: number
    useCov: boolean
  }
  ping: {
    method: 'ReadProperty' | 'WhoIs'
    frequency: number
  }
}

export interface UniversalPointConfig {
  pollFrequency: 'Fast' | 'Normal' | 'Slow'
  writePriority?: number

  // BACnet specific mapping
  bacnet?: {
    objectType: string
    instanceNumber: number
    propertyId?: string
  }

  // Modbus specific mapping
  modbus?: {
    address: number
    dataType: string // e.g. UINT16, FLOAT32
    scaling?: {
      factor: number
      offset: number
    }
  }
}
