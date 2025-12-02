import axios from 'axios'
import https from 'https'
import { sql } from '../db'
import type { 
  ReadCoilRequestDto, 
  ReadCoilResponseDto, 
  ReadHoldingRegistersRequestDto, 
  ReadHoldingRegistersResponseDto,
  WriteSingleCoilRequestDto,
  WriteSingleRegisterRequestDto
} from '../dtos/modbus.dto'

// ใช้ URL เดียวกับ BACnet ไปก่อน หรือแยก ENV ก็ได้ถ้า Gateway อยู่คนละ Port
const GATEWAY_API_URL = Bun.env.MODBUS_API_URL || 'https://localhost:7013/api'

// สร้าง Client สำหรับยิงไป C# Gateway
const client = axios.create({
  baseURL: GATEWAY_API_URL,
  httpsAgent: new https.Agent({ rejectUnauthorized: false }) // ข้าม SSL Check สำหรับ Localhost
})

export const modbusService = {
  
  /**
   * อ่านค่า Coil (Boolean) จาก Device
   */
  async readCoil(deviceIp: string, port: number = 502, unitId: number, address: number): Promise<boolean | null> {
    try {
      const payload: ReadCoilRequestDto = {
        remoteIP: deviceIp,
        remotePort: port,
        unitIdentifier: unitId,
        startingAddress: address,
        quantity: 1
      }

      const res = await client.post<ReadCoilResponseDto>('/read/coil', payload)
      
      // Gateway คืนค่ามาเป็น Array [0] หรือ [1]
      if (res.data && res.data.values && res.data.values.length > 0) {
        return res.data.values[0] === 1
      }
      return null
    } catch (error) {
      console.error(`❌ [Modbus] Read Coil Failed (IP: ${deviceIp}, Addr: ${address}):`, error)
      return null
    }
  },

  /**
   * อ่านค่า Holding Register (Word) จาก Device
   */
  async readHoldingRegister(deviceIp: string, port: number = 502, unitId: number, address: number): Promise<number | null> {
    try {
      const payload: ReadHoldingRegistersRequestDto = {
        remoteIP: deviceIp,
        remotePort: port,
        unitIdentifier: unitId,
        startingAddress: address,
        count: 1
      }

      const res = await client.post<ReadHoldingRegistersResponseDto>('/read/registers', payload)
      
      if (res.data && res.data.value !== undefined) {
        return res.data.value
      }
      return null
    } catch (error) {
      console.error(`❌ [Modbus] Read Register Failed (IP: ${deviceIp}, Addr: ${address}):`, error)
      return null
    }
  },

  /**
   * ฟังก์ชันรวมสำหรับอ่านค่า Point โดยดูจาก Config ใน DB
   */
  async readPointValue(pointId: number) {
    // 1. ดึงข้อมูล Point และ Device ที่เกี่ยวข้อง
    const [info] = await sql`
      SELECT 
        p.id, p.register_type, p.object_instance as address,
        d.ip_address, d.unit_id
      FROM points p
      JOIN devices d ON p.device_id = d.id
      WHERE p.id = ${pointId} AND d.protocol = 'MODBUS'
    `

    if (!info) throw new Error('Modbus Point not found')

    // แยก Port ออกจาก IP Address (ถ้ามี format "192.168.1.1:502")
    let ip = info.ip_address
    let port = 502
    if (ip.includes(':')) {
      const parts = ip.split(':')
      ip = parts[0]
      port = parseInt(parts[1]) || 502
    }

    // 2. เรียกฟังก์ชันอ่านตามประเภท Register
    if (info.register_type === 'COIL') {
      return await this.readCoil(ip, port, info.unit_id, info.address)
    } else if (info.register_type === 'HOLDING_REGISTER') {
      return await this.readHoldingRegister(ip, port, info.unit_id, info.address)
    }

    return null
  },

  /**
   * เขียนค่า Coil
   */
  async writeCoil(pointId: number, value: boolean) {
    const [info] = await sql`
      SELECT p.object_instance as address, d.ip_address, d.unit_id
      FROM points p
      JOIN devices d ON p.device_id = d.id
      WHERE p.id = ${pointId}
    `
    if (!info) throw new Error('Point not found')

    let ip = info.ip_address
    let port = 502
    if (ip.includes(':')) {
       const parts = ip.split(':'); ip = parts[0]; port = parseInt(parts[1]) || 502;
    }

    const payload: WriteSingleCoilRequestDto = {
      remoteIP: ip,
      remotePort: port,
      unitIdentifier: info.unit_id,
      coilAddress: info.address,
      value: value
    }

    await client.post('/write/coil', payload) 
    return true
  },

  /**
   * เขียนค่า Register
   */
  async writeRegister(pointId: number, value: number) {
    const [info] = await sql`
      SELECT p.object_instance as address, d.ip_address, d.unit_id
      FROM points p
      JOIN devices d ON p.device_id = d.id
      WHERE p.id = ${pointId}
    `
    
    // [FIXED] เพิ่มการตรวจสอบว่า info มีค่าหรือไม่
    if (!info) throw new Error('Point not found')

    // Parse IP/Port...
    let ip = info.ip_address
    let port = 502
    if (ip.includes(':')) {
       const parts = ip.split(':'); ip = parts[0]; port = parseInt(parts[1]) || 502;
    }

    const payload: WriteSingleRegisterRequestDto = {
      remoteIP: ip,
      remotePort: port,
      unitIdentifier: info.unit_id,
      registerAddress: info.address,
      value: value
    }

    await client.post('/write/register', payload)
    return true
  }
}