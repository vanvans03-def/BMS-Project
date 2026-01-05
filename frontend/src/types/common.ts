/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Device {
  id: number
  device_name: string
  device_instance_id?: number
  ip_address: string
  network_number?: number
  protocol?: 'BACNET' | 'MODBUS'
  unit_id?: number
  is_active?: boolean
  polling_interval?: number | null
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