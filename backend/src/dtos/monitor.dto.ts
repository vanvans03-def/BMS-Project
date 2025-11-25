export interface MonitorValue {
  pointId: number
  pointName: string
  objectType: string
  instance: number
  value: any
  status: boolean | string
  timestamp: string
}

export interface MonitorResponse {
  success: boolean
  message?: string
  deviceId?: number
  deviceInstanceId?: number
  count?: number
  values: MonitorValue[]
}