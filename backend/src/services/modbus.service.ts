import ModbusRTU from 'modbus-serial'
import { sql } from '../db'
import { settingsService } from './settings.service'

export const connectClient = async (ip: string, port: number, unitId: number) => {
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

  // Public Client Connection for Reuse
  connect: connectClient,

  async readCoil(deviceIp: string, port: number, unitId: number, address: number): Promise<boolean | null> {
    const client = await connectClient(deviceIp, port, unitId)
    try {
      return await this.readCoilWithClient(client, address)
    } catch (error) {
      console.error(`❌ Read Coil Error:`, error)
      return null
    } finally {
      client.close()
    }
  },

  async readCoilWithClient(client: ModbusRTU, address: number): Promise<boolean | null> {
    try {
      const data = await client.readCoils(address, 1)
      return data.data[0] ?? null
    } catch (error) {
      // Don't close client here, let caller handle it
      throw error
    }
  },

  async readHoldingRegister(deviceIp: string, port: number, unitId: number, address: number): Promise<number | null> {
    const client = await connectClient(deviceIp, port, unitId)
    try {
      return await this.readHoldingRegisterWithClient(client, address)
    } catch (error) {
      console.error(`❌ Read Holding Register Error:`, error)
      return null
    } finally {
      client.close()
    }
  },

  async readHoldingRegisterWithClient(client: ModbusRTU, address: number): Promise<number | null> {
    try {
      // Function 03: Read Holding Registers
      const data = await client.readHoldingRegisters(address, 1)
      return data.data[0] ?? null
    } catch (error) {
      throw error
    }
  },

  async readInputRegister(deviceIp: string, port: number, unitId: number, address: number): Promise<number | null> {
    const client = await connectClient(deviceIp, port, unitId)
    try {
      return await this.readInputRegisterWithClient(client, address)
    } catch (error) {
      console.error(`❌ Read Input Register Error:`, error)
      throw error
    } finally {
      client.close()
    }
  },

  async readInputRegisterWithClient(client: ModbusRTU, address: number): Promise<number | null> {
    try {
      // Function 04: Read Input Registers
      const data = await client.readInputRegisters(address, 1)
      return data.data[0] ?? null
    } catch (error) {
      throw error
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

    // [UPDATED] เพิ่มเงื่อนไขเลือกประเภท Register
    if (info.register_type === 'COIL') {
      return await this.readCoil(ip, port, info.unit_id, info.address)
    }
    else if (info.register_type === 'HOLDING_REGISTER') {
      return await this.readHoldingRegister(ip, port, info.unit_id, info.address)
    }
    else if (info.register_type === 'INPUT_REGISTER') {
      return await this.readInputRegister(ip, port, info.unit_id, info.address)
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
      // ลองอ่าน Holding Register 0 ก่อน ถ้าไม่ได้ลอง Input Register 0
      try {
        const val = await this.readHoldingRegister(deviceIp, port, unitId, 0)
        if (val !== null) return true
      } catch (e) { /* ignore */ }

      // Fallback: ลองอ่าน Input Register ดูบ้าง (เผื่อเป็น Device ที่ไม่มี Holding)
      try {
        const valInput = await this.readInputRegister(deviceIp, port, unitId, 0)
        if (valInput !== null) return true
      } catch (e) { /* ignore */ }

      return false
    } catch {
      return false
    }
  }
}