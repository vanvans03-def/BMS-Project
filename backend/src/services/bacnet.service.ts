import axios from 'axios'
import https from 'https'
import os from 'os'
import type {
  BacnetNodeDto,
  BacnetObjectIdDto,
  ReadRequestDto,
  ReadResultDto,
  BacnetPointDto,
  MonitorValueDto,
  WriteRequestDto,
  BacnetDriverConfig
} from '../dtos/bacnet.dto'
import { sql } from '../db'

// ใช้ Config จาก .env
const BACnet_API_URL = Bun.env.BACNET_API_URL || 'https://localhost:7174/api'

const client = axios.create({
  baseURL: BACnet_API_URL,
  httpsAgent: new https.Agent({ rejectUnauthorized: false })
})

// === Utility for IP Math ===
function ipToLong(ip: string): number {
  let ipl = 0;
  ip.split('.').forEach((octet) => {
    ipl <<= 8;
    ipl += parseInt(octet);
  });
  return (ipl >>> 0);
}

function getNetmaskLen(netmask: string): number {
  let bits = 0
  const parts = netmask.split('.')
  parts.forEach(part => {
    let n = parseInt(part, 10)
    while (n > 0) {
      if ((n & 1) === 1) bits++
      n >>= 1
    }
  })
  return bits
}

function isIpInSubnet(ip: string, subnetIp: string, netmask: string): boolean {
  const ipLong = ipToLong(ip);
  const subnetLong = ipToLong(subnetIp);
  const maskLong = ipToLong(netmask);

  return (ipLong & maskLong) === (subnetLong & maskLong);
}

function getInterfaceInfo(nameOrIp: string) {
  const interfaces = os.networkInterfaces();

  // 1. Try to find by Name (e.g. eth0)
  if (interfaces[nameOrIp]) {
    const ipv4 = interfaces[nameOrIp]?.find(i => i.family === 'IPv4');
    if (ipv4) return { ip: ipv4.address, netmask: ipv4.netmask };
  }

  // 2. Try to find by IP Address
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name]?.find(i => i.family === 'IPv4' && i.address === nameOrIp);
    if (iface) return { ip: iface.address, netmask: iface.netmask };
  }

  // 3. Fallback: Return null
  return null;
}

export const bacnetService = {

  // 1. Discovery with Port Filtering
  async discoverDevices(timeout: number = 3): Promise<{ devices: BacnetNodeDto[], scanningPort: number }> {
    try {
      console.log(`🔍 [BACNET] Discovery with timeout=${timeout}s...`)

      // 1. Get Driver Config from DB
      let bacnetPort = 47808 // Default 0xBAC0
      let bacnetInterface = 'eth0'

      try {
        const drivers = await sql<any[]>`
            SELECT config FROM devices 
            WHERE device_type = 'DRIVER' AND protocol = 'BACNET_IP' 
            LIMIT 1
        `

        if (drivers.length > 0 && drivers[0].config) {
          const config = drivers[0].config as BacnetDriverConfig

          // Extract Port
          if (config.transport?.udpPort) {
            // Parse HEX String e.g. "0xBAC0" -> 47808
            const portStr = config.transport.udpPort
            if (typeof portStr === 'string' && portStr.startsWith('0x')) {
              bacnetPort = parseInt(portStr, 16)
            } else {
              bacnetPort = Number(portStr)
            }
          }

          // Extract Interface
          if (config.transport?.interface) {
            bacnetInterface = config.transport.interface
          }

          console.log(`⚙️ [BACNET] Using Config -> Port: ${bacnetPort} (0x${bacnetPort.toString(16).toUpperCase()}), Interface: ${bacnetInterface}`)
        } else {
          console.warn('⚠️ No BACnet Driver config found, using defaults')
        }

      } catch (dbError) {
        console.error('⚠️ Failed to load driver config from DB:', dbError)
      }

      // Resolve Interface Details
      const ifaceInfo = getInterfaceInfo(bacnetInterface);
      if (ifaceInfo) {
        console.log(`   -> Resolved Interface: IP=${ifaceInfo.ip}, Netmask=${ifaceInfo.netmask}`);
      } else {
        console.warn(`   -> ⚠️ Could not resolve interface '${bacnetInterface}'. Skipping interface filtering.`);
      }

      // 2. Discover all devices (Request to C#)
      const response = await client.get<BacnetNodeDto[]>('/Discovery', {
        params: { timeout }
      })

      const allDevices = response.data || []

      // 3. Filter by Port AND Interface (Subnet)
      const filteredDevices = allDevices.filter(device => {
        if (!device.address) return false

        const parts = device.address.split(':')
        if (parts.length !== 2) return false

        const deviceIp = parts[0]!;
        const devicePort = parseInt(parts[1]!, 10)

        // Filter 1: Port Match
        if (devicePort !== bacnetPort) return false;

        // Filter 2: Interface (Subnet) Match
        if (ifaceInfo) {
          if (!isIpInSubnet(deviceIp, ifaceInfo.ip, ifaceInfo.netmask)) {
            // Optional: Allow Localhost exceptional case?
            if (deviceIp !== '127.0.0.1' && deviceIp !== ifaceInfo.ip) {
              return false;
            }
          }
        }

        return true;
      })

      console.log(`✅ [BACNET] Found ${filteredDevices.length} devices matching Port ${bacnetPort} & Interface ${bacnetInterface}`)

      return {
        devices: filteredDevices,
        scanningPort: bacnetPort
      }

    } catch (error) {
      console.error('❌ Discovery Failed:', error)
      return { devices: [], scanningPort: 47808 }
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