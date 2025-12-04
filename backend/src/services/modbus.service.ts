import ModbusRTU from 'modbus-serial'
import { sql } from '../db'
import { settingsService } from './settings.service'

const connectClient = async (ip: string, port: number, unitId: number) => {
  const client = new ModbusRTU()
  try {
    const settings = await settingsService.getSettings()
    const timeout = Number(settings.modbus_timeout) || 5000
    
    client.setTimeout(timeout)
    await client.connectTCP(ip, { port: port })
    client.setID(unitId)
    
    return client
  } catch (error) {
    console.error(`❌ [Modbus] Connection Failed (${ip}:${port}):`, error)
    throw error
  }
}

export const modbusService = {
  
  async readCoil(deviceIp: string, port: number, unitId: number, address: number): Promise<boolean | null> {
    const client = await connectClient(deviceIp, port, unitId)
    try {
      const data = await client.readCoils(address, 1)
      // [FIXED] ใช้ ?? null เพื่อจัดการกรณี undefined
      return data.data[0] ?? null
    } catch (error) {
      console.error(`❌ Read Coil Error:`, error)
      return null
    } finally {
      client.close()
    }
  },

  async readHoldingRegister(deviceIp: string, port: number, unitId: number, address: number): Promise<number | null> {
    const client = await connectClient(deviceIp, port, unitId)
    try {
      const data = await client.readHoldingRegisters(address, 1)
      // [FIXED] ใช้ ?? null เพื่อจัดการกรณี undefined
      return data.data[0] ?? null
    } catch (error) {
      console.error(`❌ Read Register Error:`, error)
      return null
    } finally {
      client.close()
    }
  },

  async readPointValue(pointId: number) {
    const [info] = await sql`
      SELECT 
        p.id, p.register_type, p.object_instance as address, 
        d.ip_address, d.unit_id
      FROM points p
      JOIN devices d ON p.device_id = d.id
      WHERE p.id = ${pointId}
    `

    if (!info) throw new Error('Modbus Point not found')

    let ip = info.ip_address
    let port = 502
    if (ip && ip.includes(':')) {
      const parts = ip.split(':')
      ip = parts[0]
      port = parseInt(parts[1]) || 502
    }

    if (info.register_type === 'COIL') {
      return await this.readCoil(ip, port, info.unit_id, info.address)
    } 
    if (info.register_type === 'HOLDING_REGISTER') {
      return await this.readHoldingRegister(ip, port, info.unit_id, info.address)
    }
    return null
  },

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
    if (ip && ip.includes(':')) {
      const parts = ip.split(':')
      ip = parts[0]
      port = parseInt(parts[1]) || 502
    }

    const client = await connectClient(ip, port, info.unit_id)
    try {
      console.log(`📝 [Modbus] Writing Coil: ${info.address} -> ${value}`)
      await client.writeCoil(info.address, value)
      
      const { auditLogService } = await import('./audit-log.service')
      await auditLogService.recordLog({
        user_name: userName,
        action_type: 'WRITE',
        target_name: `[${info.device_name}] ${info.point_name}`,
        details: `Set to ${value ? 'ON' : 'OFF'}`,
        protocol: 'MODBUS'
      })
      
      return true
    } catch (error) {
      console.error(`❌ Write Coil Error:`, error)
      throw error
    } finally {
      client.close()
    }
  },

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
    if (ip && ip.includes(':')) {
      const parts = ip.split(':')
      ip = parts[0]
      port = parseInt(parts[1]) || 502
    }

    const client = await connectClient(ip, port, info.unit_id)
    try {
      console.log(`📝 [Modbus] Writing Register: ${info.address} -> ${value}`)
      await client.writeRegister(info.address, value)
      
      const { auditLogService } = await import('./audit-log.service')
      await auditLogService.recordLog({
        user_name: userName,
        action_type: 'WRITE',
        target_name: `[${info.device_name}] ${info.point_name}`,
        details: `Set to ${value}`,
        protocol: 'MODBUS'
      })
      
      return true
    } catch (error) {
      console.error(`❌ Write Register Error:`, error)
      throw error
    } finally {
      client.close()
    }
  },

  async testConnection(deviceIp: string, port: number, unitId: number): Promise<boolean> {
    try {
      const val = await this.readHoldingRegister(deviceIp, port, unitId, 0)
      return val !== null
    } catch {
      return false
    }
  }
}