// DTO สำหรับรับค่าจาก Frontend เพื่อสร้าง Device ใหม่
export interface CreateModbusDeviceDto {
  device_name: string
  ip_address: string
  port?: number
  unit_id: number
  protocol: 'MODBUS'
}

// DTO สำหรับรับค่าจาก Frontend เพื่อสร้าง Point ใหม่
export interface CreateModbusPointDto {
  device_id: number
  point_name: string
  register_type: 'COIL' | 'HOLDING_REGISTER' | 'INPUT_REGISTER' | 'DISCRETE_INPUT'
  address: number // ใช้ field object_instance ใน DB เก็บค่านี้แทน
  data_type?: 'BOOL' | 'INT16' | 'UINT16' | 'FLOAT32'
}

// --- DTO สำหรับคุยกับ C# Gateway (Request) ---

export interface ReadCoilRequestDto {
  remoteIP: string
  remotePort: number
  unitIdentifier: number
  startingAddress: number
  quantity: number
}

export interface ReadHoldingRegistersRequestDto {
  remoteIP: string
  remotePort: number
  unitIdentifier: number
  startingAddress: number
  count: number
}

// DTO สำหรับการเขียนค่า (ตามที่คาดว่าจะเพิ่มในอนาคต)
export interface WriteSingleCoilRequestDto {
  remoteIP: string
  remotePort: number
  unitIdentifier: number
  coilAddress: number
  value: boolean
}

export interface WriteSingleRegisterRequestDto {
  remoteIP: string
  remotePort: number
  unitIdentifier: number
  registerAddress: number
  value: number
}

// --- DTO Response จาก Gateway ---

export interface ReadCoilResponseDto {
  values: number[] // 0 or 1
}

export interface ReadHoldingRegistersResponseDto {
  value: number // Raw Integer value
}

export interface WriteResponseDto {
  success: boolean
  message?: string
}