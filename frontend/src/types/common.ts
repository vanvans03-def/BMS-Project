/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Device {
  id: number
  device_name: string
  device_instance_id?: number
  ip_address?: string
  network_number?: number
  protocol?: 'BACNET' | 'MODBUS'
  unit_id?: number
  is_active?: boolean
  polling_interval?: number | null
  device_type?: 'GATEWAY' | 'DEVICE'
  parent_id?: number | null
  config?: any

  // Serial / Modbus Fields
  connection_type?: string
  serial_port_name?: string
  serial_baud_rate?: number
  serial_data_bits?: number
  serial_stop_bits?: number
  serial_parity?: string
  tcp_response_timeout?: number
}

export interface Point {
  id: number
  device_id: number
  object_type: string
  object_instance: number
  point_name: string
  is_monitor: boolean
  register_type?: string
  data_type?: string
  data_format?: string
  display_type?: string
  config?: any
  // [NEW]
  location_id?: number | null
  is_history_enabled?: boolean
  universal_type?: string
}

export interface PointValue {
  pointId: number
  pointName: string
  objectType: string
  instance: number
  value: any
  status: string
  timestamp: string
}