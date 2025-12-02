import axios from 'axios'
import https from 'https'
import type {
  BacnetNodeDto,
  BacnetObjectIdDto,
  ReadRequestDto,
  ReadResultDto,
  BacnetPointDto,
  MonitorValueDto,
  WriteRequestDto
} from '../dtos/bacnet.dto'

// ใช้ Config จาก .env
const BACnet_API_URL = Bun.env.BACNET_API_URL || 'https://localhost:7174/api'

const client = axios.create({
  baseURL: BACnet_API_URL,
  httpsAgent: new https.Agent({ rejectUnauthorized: false })
})

export const bacnetService = {

  // 1. Discovery with Port Filtering
  async discoverDevices(timeout: number = 3): Promise<BacnetNodeDto[]> {
    try {
      console.log(`🔍 [BACNET] Discovery with timeout=${timeout}s...`)

      // Get BACnet port setting from backend
      let bacnetPort: number | null = null
      try {
        const settingsResponse = await client.get<{ bacnet_port?: number }>('/settings')
        bacnetPort = settingsResponse.data?.bacnet_port ?? null
        console.log(`⚙️ [BACNET] Configured port: ${bacnetPort || 'Not specified (show all)'}`)
      } catch (error) {
        console.warn('⚠️ Could not fetch settings, showing all devices')
      }

      // Discover all devices
      const response = await client.get<BacnetNodeDto[]>('/Discovery', {
        params: { timeout }
      })

      const allDevices = response.data || []

      // If no port specified, return all devices
      if (!bacnetPort) {
        console.log(`✅ [BACNET] Found ${allDevices.length} devices (no port filter)`)
        return allDevices
      }

      // Filter devices by port
      const filteredDevices = allDevices.filter(device => {
        // Check if address exists
        if (!device.address) {
          return false
        }

        // Parse address format: "192.168.1.143:47808"
        const addressParts = device.address.split(':')

        if (addressParts.length === 2 && addressParts[1]) {
          const devicePort = parseInt(addressParts[1], 10)
          return devicePort === bacnetPort
        }

        // If address has no port, skip this device
        return false
      })

      console.log(`✅ [BACNET] Found ${filteredDevices.length}/${allDevices.length} devices on port ${bacnetPort}`)

      if (filteredDevices.length < allDevices.length) {
        console.log(`ℹ️ [BACNET] Filtered out ${allDevices.length - filteredDevices.length} devices on different ports`)
      }

      return filteredDevices

    } catch (error) {
      console.error('❌ Discovery Failed:', error)
      return []
    }
  },
  // 2. Get Objects (Points)
  async getObjects(deviceId: number): Promise<BacnetPointDto[]> {
    try {
      const response = await client.get<BacnetObjectIdDto[]>(`/ObjectList/${deviceId}`);

      return response.data.map(obj => ({
        instance: obj.instant, // Map แก้คำผิดจาก C# instant -> instance
        objectType: obj.type,
        name: `${obj.type}:${obj.instant}`
      }));
    } catch (error) {
      console.error(`❌ Get Objects Failed for device ${deviceId}:`, error);
      return [];
    }
  },

  // 3. Read Multiple (Monitor)
  async readMultiple(points: ReadRequestDto[]): Promise<MonitorValueDto[]> {
    try {
      const response = await client.post<ReadResultDto[]>(`/ReadWrite/readMultiple`, points);

      return response.data.map(res => ({
        deviceId: res.deviceId,
        objectType: res.objectType,
        instance: res.instance,
        propertyId: res.propertyId,
        value: res.value?.value,
        status: res.status
      }));
    } catch (error) {
      console.error('❌ Read Multiple Failed:', error);
      return [];
    }
  },

  // 4. Write Value (รับ DTO ตัวเดียว จบปัญหาสับสน)
  async writeProperty(req: WriteRequestDto): Promise<boolean> {
    try {
      // URL Pattern ตาม C# Swagger
      const url = `/ReadWrite/devices/${req.deviceId}/objects/${req.objectType}/${req.instance}/properties/${req.propertyId}`

      console.log(`📝 [BACNET] Writing to ${url} Value: ${req.value}`)

      // ส่ง Body ไปให้ C# (C# จะไปจัดการ Type conversion เองตามที่เราแก้ไว้แล้ว)
      await client.put(url, {
        value: req.value
      })

      return true
    } catch (error) {
      console.error('❌ Write Failed:', error)
      throw error
    }
  }
}