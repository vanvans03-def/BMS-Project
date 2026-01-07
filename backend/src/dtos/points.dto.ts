export interface Point {
  id?: number
  device_id: number
  object_type: string
  object_instance: number
  point_name: string
  description?: string
  is_monitor: boolean
  created_at?: string

  // New Report Fields
  point_mark?: string
  report_table_name?: string
}

export interface Device {
  id: number
  device_name: string
  device_instance_id: number
  ip_address: string
  network_number?: number
  is_active?: boolean
}

export interface SyncPointsResult {
  success: boolean
  message?: string
  count?: number
  points?: Point[]
}
