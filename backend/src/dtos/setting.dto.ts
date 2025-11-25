// Interface สำหรับค่า Settings ที่ Frontend จะส่งมา/รับไป
export interface SystemSettings {
  site_name?: string
  description?: string
  contact_info?: string
  bacnet_device_id?: number
  bacnet_port?: number
  polling_interval?: number
  discovery_timeout?: number
  [key: string]: any // เผื่อมีค่าอื่นๆ ในอนาคต
}