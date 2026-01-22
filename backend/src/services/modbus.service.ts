import ModbusRTU from 'modbus-serial'
import { sql } from '../db'
import { settingsService } from './settings.service'
import { configService } from './config.service'

// Interface for Connection Parameters
export interface ConnectionParams {
  type: 'TCP' | 'SERIAL'
  ip?: string
  port?: number
  serialPort?: string
  baudRate?: number
  dataBits?: number
  stopBits?: number
  parity?: 'none' | 'even' | 'odd'
  timeout?: number
}

export const connectClient = async (params: ConnectionParams, unitId: number) => {
  const client = new ModbusRTU()
  try {
    const timeout = params.timeout || 5000
    client.setTimeout(timeout)

    // Check strict equality to avoid undefined errors
    if (params.type === 'SERIAL') {
      if (!params.serialPort) throw new Error('Serial Port is required for SERIAL connection')

      // Connect Serial (RTU)
      await client.connectRTUBuffered(params.serialPort, {
        baudRate: params.baudRate || 9600,
        dataBits: params.dataBits || 8,
        stopBits: params.stopBits || 1,
        parity: params.parity || 'none'
      })
    } else {
      // Connect TCP (Default)
      let targetIp = params.ip || '127.0.0.1'
      let targetPort = params.port || 502

      // Clean IP if needed
      if (targetIp.includes(':')) {
        const parts = targetIp.split(':')
        targetIp = parts[0]!
        targetPort = parseInt(parts[1]!) || targetPort
      }

      await client.connectTCP(targetIp, { port: targetPort })
    }

    client.setID(unitId)
    return client
  } catch (error) {
    console.error(`❌ [Modbus] Connection Failed (${JSON.stringify(params)}):`, error)
    throw error
  }
}

// Helper to get connection params for a Point or Device
export const getConnectionInfo = async (deviceId: number) => {
  // Fetch device and its parent to determine connection path
  const [device] = await sql`
    SELECT 
      d.*,
      parent.ip_address as parent_ip,
      parent.connection_type as parent_connection_type,
      parent.serial_port_name as parent_serial_port,
      parent.serial_baud_rate as parent_baud_rate,
      parent.serial_data_bits as parent_data_bits,
      parent.serial_stop_bits as parent_stop_bits,
      parent.serial_parity as parent_parity,
      parent.tcp_response_timeout as parent_timeout
    FROM devices d
    LEFT JOIN devices parent ON d.parent_id = parent.id
    WHERE d.id = ${deviceId}
  `

  if (!device) throw new Error('Device not found')

  // Determine Connection Source (Self or Parent)
  // If device has parent, parent usually holds the connection info (Gateway)
  // modifying to prefer Parent config if exists
  const useParent = !!device.parent_id

  const type = (useParent ? device.parent_connection_type : device.connection_type) || 'TCP'
  const ip = useParent ? device.parent_ip : device.ip_address
  const port = 502 // TODO: Store port in DB if non-standard

  const serialPort = useParent ? device.parent_serial_port : device.serial_port_name
  const baudRate = useParent ? device.parent_baud_rate : device.serial_baud_rate
  const dataBits = useParent ? device.parent_data_bits : device.serial_data_bits
  const stopBits = useParent ? device.parent_stop_bits : device.serial_stop_bits
  const parity = useParent ? device.parent_parity : device.serial_parity

  const timeout = (useParent ? device.parent_timeout : device.tcp_response_timeout) || 1000

  return {
    params: {
      type: type as 'TCP' | 'SERIAL',
      ip,
      port,
      serialPort,
      baudRate,
      dataBits,
      stopBits,
      parity: parity as 'none' | 'even' | 'odd',
      timeout
    },
    unitId: device.unit_id,
    byteOrderFloat: device.byte_order_float,
    byteOrderLong: device.byte_order_long,
    deviceName: device.device_name
  }
}

export const modbusService = {
  connect: connectClient,

  async readCoil(pointId: number, address: number): Promise<boolean | null> {
    // NOTE: Original signature was (ip, port...) but we need DB lookup now to handle Serial/TCP complexity properly
    // So we change internal calls to use pointId if possible, or we must fetch connection info first.
    // But preserving method signature for compatibility might be hard if we change logic drastically.
    // Let's refactor `readPointValue` to handle the connection setup.
    return null // Deprecated direct call, use readPointValue
  },

  async readPointValue(pointId: number) {
    const [point] = await sql`SELECT * FROM points WHERE id = ${pointId}`
    if (!point) throw new Error('Modbus Point not found')

    const { params, unitId, byteOrderFloat, byteOrderLong } = await getConnectionInfo(point.device_id)

    // [TODO: Handle Byte Order swapping here if needed, or pass options to client]
    // modbus-serial doesn't inherently support complex byte swapping in one go, usually done post-read buffer.

    const client = await connectClient(params, unitId)

    try {
      let result: any = null

      if (point.register_type === 'COIL') {
        const data = await client.readCoils(point.object_instance, 1)
        result = data.data[0] ?? null
      }
      else if (point.register_type === 'DISCRETE_INPUT') {
        const data = await client.readDiscreteInputs(point.object_instance, 1)
        result = data.data[0] ?? null
      }
      else if (point.register_type === 'HOLDING_REGISTER') {
        // [NEW] String Handling
        if (point.data_type === 'STRING') {
          const length = point.data_length || 10 // Default 10 regs

          // Reuse the string reading logic
          const data = await client.readHoldingRegisters(point.object_instance, length)
          const buffer = Buffer.alloc(data.data.length * 2)
          for (let i = 0; i < data.data.length; i++) {
            buffer.writeUInt16BE(data.data[i]!, i * 2)
          }
          result = buffer.toString('ascii').replace(/\0/g, '')
        }
        else if (point.data_type === 'FLOAT32' || point.data_type === 'INT32' || point.data_type === 'UINT32') {
          // Javascript/modbus-serial usually reads registers.
          // We might need to read 2 registers
          const data32 = await client.readHoldingRegisters(point.object_instance, 2)
          // Then buffer convert based on Endianness
          // For now, return raw register and let frontend or upper layer handle, 
          // OR implement simple logic here.
          // Keeping it simple: Original code returned number.
          result = data32.data[0] // Valid only for 16-bit

          // TODO: Real 32-bit parsing requires Buffer manipulation
        } else {
          // Standard 16-bit
          const data = await client.readHoldingRegisters(point.object_instance, 1) // Read 1 word
          result = data.data[0]
        }
      }
      else if (point.register_type === 'INPUT_REGISTER') {
        if (point.data_type === 'STRING') {
          const length = point.data_length || 10
          const data = await client.readInputRegisters(point.object_instance, length)
          const buffer = Buffer.alloc(data.data.length * 2)
          for (let i = 0; i < data.data.length; i++) {
            buffer.writeUInt16BE(data.data[i]!, i * 2)
          }
          result = buffer.toString('ascii').replace(/\0/g, '')
        } else {
          const data = await client.readInputRegisters(point.object_instance, 1)
          result = data.data[0] ?? null
        }
      }

      return result
    } finally {
      client.close()
    }
  },

  async writeCoil(pointId: number, value: boolean, userName: string = 'System') {
    const [point] = await sql`SELECT * FROM points WHERE id = ${pointId}`
    if (!point) throw new Error('Point not found')

    const { params, unitId, deviceName } = await getConnectionInfo(point.device_id)
    const client = await connectClient(params, unitId)

    try {
      console.log(`📝 [Modbus] Writing Coil: ${point.object_instance} -> ${value}`)
      await client.writeCoil(point.object_instance, value)

      const { auditLogService } = await import('./audit-log.service')
      await auditLogService.recordLog({
        user_name: userName,
        action_type: 'WRITE',
        target_name: `[${deviceName}] ${point.point_name}`,
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
    const [point] = await sql`SELECT * FROM points WHERE id = ${pointId}`
    if (!point) throw new Error('Point not found')

    const { params, unitId, deviceName } = await getConnectionInfo(point.device_id)
    const client = await connectClient(params, unitId)

    try {
      console.log(`📝 [Modbus] Writing Register: ${point.object_instance} -> ${value}`)
      await client.writeRegister(point.object_instance, value)

      const { auditLogService } = await import('./audit-log.service')
      await auditLogService.recordLog({
        user_name: userName,
        action_type: 'WRITE',
        target_name: `[${deviceName}] ${point.point_name}`,
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

  async testConnection(ip: string, port: number, unitId: number): Promise<boolean> {
    // This helper is mainly for TCP Ping test
    // If we want to test serial, we'd need different params
    try {
      const client = new ModbusRTU()
      client.setTimeout(2000)
      await client.connectTCP(ip, { port: port || 502 })
      client.setID(unitId)

      // Try reading 1 register
      await client.readHoldingRegisters(0, 1)

      client.close()
      return true
    } catch (e) {
      console.error("Test connection failed:", e)
      return false
    }
  },

  // -------------------------------------------------------------------------
  // Reused Connection Helpers (for Monitor Service)
  // -------------------------------------------------------------------------

  async readCoilWithClient(client: ModbusRTU, address: number): Promise<boolean | null> {
    try {
      const data = await client.readCoils(address, 1)
      return data.data[0] ?? null
    } catch (error) {
      console.error(`❌ readCoilWithClient Error (Addr: ${address}):`, error)
      throw error
    }
  },

  async readHoldingRegisterWithClient(client: ModbusRTU, address: number): Promise<number | null> {
    try {
      const data = await client.readHoldingRegisters(address, 1)
      return data.data[0] ?? null
    } catch (error) {
      console.error(`❌ readHoldingRegisterWithClient Error (Addr: ${address}):`, error)
      throw error
    }
  },

  async readInputRegisterWithClient(client: ModbusRTU, address: number): Promise<number | null> {
    try {
      const data = await client.readInputRegisters(address, 1)
      return data.data[0] ?? null
    } catch (error) {
      console.error(`❌ readInputRegisterWithClient Error (Addr: ${address}):`, error)
      throw error
    }
  },

  async readDiscreteInputWithClient(client: ModbusRTU, address: number): Promise<boolean | null> {
    try {
      const data = await client.readDiscreteInputs(address, 1)
      return data.data[0] ?? null
    } catch (error) {
      console.error(`❌ readDiscreteInputWithClient Error (Addr: ${address}):`, error)
      throw error
    }
  },

  // [NEW] String Support
  async readStringWithClient(client: ModbusRTU, address: number, length: number, isInput: boolean = false): Promise<string | null> {
    try {
      // Read N registers (each register = 2 bytes / 2 chars usually)
      const data = isInput
        ? await client.readInputRegisters(address, length)
        : await client.readHoldingRegisters(address, length)

      if (!data.data || data.data.length === 0) return null

      // Convert registers to buffer/string
      // Modbus-serial returns array of numbers (uint16).
      // We need to convert to Buffer then String.
      // 1 Register = 2 Bytes.
      const buffer = Buffer.alloc(data.data.length * 2)
      for (let i = 0; i < data.data.length; i++) {
        buffer.writeUInt16BE(data.data[i]!, i * 2)
      }
      // Trim null bytes
      return buffer.toString('ascii').replace(/\0/g, '')
    } catch (error) {
      console.error(`❌ readStringWithClient Error (Addr: ${address}):`, error)
      throw error
    }
  },

  async writeString(pointId: number, value: string, userName: string = 'System') {
    const [point] = await sql`SELECT * FROM points WHERE id = ${pointId}`
    if (!point) throw new Error('Point not found')

    const { params, unitId, deviceName } = await getConnectionInfo(point.device_id)
    const client = await connectClient(params, unitId)

    try {
      console.log(`📝 [Modbus] Writing String: ${point.object_instance} -> "${value}"`)

      // Convert String to Registers
      const buffer = Buffer.alloc(value.length)
      buffer.write(value, 'ascii')

      // Pad to nearest even byte count if odd (though buffers usually nice)
      // We need strict register alignment. 
      // How many registers? 
      // If point has fixed data_length, we should respect it or truncate/pad.
      // For now, just write what we have.

      const numRegisters = Math.ceil(buffer.length / 2)
      const registers = []
      // We don't need this loop if we build finalBuffer directly
      // for (let i = 0; i < numRegisters; i++) { ... }

      // Re-do robust buffer padding
      const targetLength = (point.data_length || numRegisters) * 2 // in bytes
      const finalBuffer = Buffer.alloc(targetLength)
      finalBuffer.write(value, 'ascii') // writes as much as fits

      const dataToWrite = []
      for (let i = 0; i < targetLength / 2; i++) {
        dataToWrite.push(finalBuffer.readUInt16BE(i * 2))
      }

      await client.writeRegisters(point.object_instance, dataToWrite)

      const { auditLogService } = await import('./audit-log.service')
      await auditLogService.recordLog({
        user_name: userName,
        action_type: 'WRITE',
        target_name: `[${deviceName}] ${point.point_name}`,
        details: `Set to "${value}"`,
        protocol: 'MODBUS'
      })

      return true
    } catch (error) {
      console.error(`❌ Write String Error:`, error)
      throw error
    } finally {
      client.close()
    }
  }
}