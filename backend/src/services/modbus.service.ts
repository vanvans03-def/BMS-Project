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

const GATEWAY_API_URL = Bun.env.MODBUS_API_URL || 'https://localhost:7013'

const client = axios.create({
  baseURL: GATEWAY_API_URL,
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 10000
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

      console.log(`📖 [Modbus] Reading Coil: ${deviceIp}:${port} Unit:${unitId} Addr:${address}`)
      
      const res = await client.post<ReadCoilResponseDto>('/read/coil', payload)
      
      if (res.data && res.data.values && res.data.values.length > 0) {
        return res.data.values[0] === 1
      }
      return null
    } catch (error) {
      console.error(`❌ [Modbus] Read Coil Failed (${deviceIp}:${address}):`, error)
      return null
    }
  },

  /**
   * อ่านค่า Holding Register (Word) จาก Device
   */
  async readHoldingRegister(
    deviceIp: string, 
    port: number = 502, 
    unitId: number, 
    address: number
  ): Promise<number | null> {
    try {
      const payload: ReadHoldingRegistersRequestDto = {
        remoteIP: deviceIp,
        remotePort: port,
        unitIdentifier: unitId,
        startingAddress: address,
        count: 1
      }

      console.log(`📖 [Modbus] Reading Register: ${deviceIp}:${port} Unit:${unitId} Addr:${address}`)
      
      const res = await client.post<ReadHoldingRegistersResponseDto>('/read/registers', payload)
      
      if (res.data && res.data.value !== undefined) {
        return res.data.value
      }
      return null
    } catch (error) {
      console.error(`❌ [Modbus] Read Register Failed (${deviceIp}:${address}):`, error)
      return null
    }
  },

  /**
   * อ่านค่า Point โดยดึง Config จาก Database
   */
  async readPointValue(pointId: number) {
    const [info] = await sql`
      SELECT 
        p.id, p.register_type, p.object_instance as address, p.data_type,
        d.ip_address, d.unit_id
      FROM points p
      JOIN devices d ON p.device_id = d.id
      WHERE p.id = ${pointId} AND d.protocol = 'MODBUS'
    `

    if (!info) throw new Error('Modbus Point not found')

    // แยก IP และ Port
    let ip = info.ip_address
    let port = 502
    if (ip && ip.includes(':')) {
      const parts = ip.split(':')
      ip = parts[0]
      port = parseInt(parts[1]) || 502
    }

    // อ่านค่าตาม Register Type
    if (info.register_type === 'COIL') {
      return await this.readCoil(ip, port, info.unit_id, info.address)
    } 
    if (info.register_type === 'HOLDING_REGISTER') {
      return await this.readHoldingRegister(ip, port, info.unit_id, info.address)
    }

    return null
  },

  /**
   * เขียนค่า Coil (Boolean)
   */
  async writeCoil(pointId: number, value: boolean, userName: string = 'System') {
    const [info] = await sql`
      SELECT 
        p.object_instance as address, p.point_name,
        d.ip_address, d.unit_id, d.device_name
      FROM points p
      JOIN devices d ON p.device_id = d.id
      WHERE p.id = ${pointId}
    `
    
    if (!info) throw new Error('Point not found')

    let ip = info.ip_address
    let port = 502
    if (ip.includes(':')) {
      const parts = ip.split(':')
      ip = parts[0]
      port = parseInt(parts[1]) || 502
    }

    const payload: WriteSingleCoilRequestDto = {
      remoteIP: ip,
      remotePort: port,
      unitIdentifier: info.unit_id,
      coilAddress: info.address,
      value: value
    }

    console.log(`📝 [Modbus] Writing Coil:`, payload)
    
    await client.post('/write/coil', payload)
    
    // บันทึก Audit Log
    const { auditLogService } = await import('./audit-log.service')
    await auditLogService.recordLog({
      user_name: userName,
      action_type: 'WRITE',
      target_name: `[${info.device_name}] ${info.point_name}`,
      details: `Set to ${value ? 'ON' : 'OFF'}`,
      protocol: 'MODBUS'
    })
    
    return true
  },

  /**
   * เขียนค่า Holding Register (Number)
   */
  async writeRegister(pointId: number, value: number, userName: string = 'System') {
    const [info] = await sql`
      SELECT 
        p.object_instance as address, p.point_name,
        d.ip_address, d.unit_id, d.device_name
      FROM points p
      JOIN devices d ON p.device_id = d.id
      WHERE p.id = ${pointId}
    `
    
    if (!info) throw new Error('Point not found')

    let ip = info.ip_address
    let port = 502
    if (ip.includes(':')) {
      const parts = ip.split(':')
      ip = parts[0]
      port = parseInt(parts[1]) || 502
    }

    const payload: WriteSingleRegisterRequestDto = {
      remoteIP: ip,
      remotePort: port,
      unitIdentifier: info.unit_id,
      registerAddress: info.address,
      value: value
    }

    console.log(`📝 [Modbus] Writing Register:`, payload)
    
    await client.post('/write/register', payload)
    
    // บันทึก Audit Log
    const { auditLogService } = await import('./audit-log.service')
    await auditLogService.recordLog({
      user_name: userName,
      action_type: 'WRITE',
      target_name: `[${info.device_name}] ${info.point_name}`,
      details: `Set to ${value}`,
      protocol: 'MODBUS'
    })
    
    return true
  },

  /**
   * ทดสอบการเชื่อมต่อกับ Device
   */
  async testConnection(deviceIp: string, port: number = 502, unitId: number): Promise<boolean> {
    try {
      // อ่าน Register 0 เพื่อทดสอบการเชื่อมต่อ
      const result = await this.readHoldingRegister(deviceIp, port, unitId, 0)
      return result !== null
    } catch {
      return false
    }
  }
}