import { sql } from '../db'

// Interface for Network Config
export interface NetworkConfig {
  id: number
  name: string
  protocol: 'BACNET' | 'MODBUS'
  enable: boolean
  config: any
  created_at: string
  updated_at: string
}

// Interface for Device Config
export interface DeviceConfigRecord {
  id: number
  device_id: number
  network_config_id: number | null
  config: any
  updated_at: string
}

// Interface for Point Config
export interface PointConfigRecord {
  id: number
  point_id: number
  config: any
  updated_at: string
}

export const configService = {
  // ============ NETWORK CONFIG ============
  
  async getNetworkConfigs(protocol?: 'BACNET' | 'MODBUS'): Promise<NetworkConfig[]> {
    if (protocol) {
      return await sql<NetworkConfig[]>`
        SELECT * FROM network_config 
        WHERE protocol = ${protocol}
        ORDER BY created_at ASC
      `
    }
    return await sql<NetworkConfig[]>`
      SELECT * FROM network_config 
      ORDER BY protocol ASC, created_at ASC
    `
  },

  async getNetworkConfigById(id: number): Promise<NetworkConfig | null> {
    const [result] = await sql<NetworkConfig[]>`
      SELECT * FROM network_config WHERE id = ${id}
    `
    return (result as NetworkConfig) || null
  },

  async createNetworkConfig(
    name: string,
    protocol: 'BACNET' | 'MODBUS',
    config: any,
    enable: boolean = true
  ): Promise<NetworkConfig> {
    const [result] = await sql<NetworkConfig[]>`
      INSERT INTO network_config (name, protocol, config, enable)
      VALUES (${name}, ${protocol}, ${config}, ${enable})
      RETURNING *
    `
    return result as NetworkConfig
  },

  async updateNetworkConfig(
    id: number,
    updates: Partial<Pick<NetworkConfig, 'name' | 'config' | 'enable'>>
  ): Promise<NetworkConfig | null> {
    const setClause: any = {}
    if (updates.name !== undefined) setClause.name = updates.name
    if (updates.config !== undefined) setClause.config = updates.config
    if (updates.enable !== undefined) setClause.enable = updates.enable
    setClause.updated_at = new Date()

    const [result] = await sql<NetworkConfig[]>`
      UPDATE network_config 
      SET ${sql(setClause)}
      WHERE id = ${id}
      RETURNING *
    `
    return (result as NetworkConfig) || null
  },

  async deleteNetworkConfig(id: number): Promise<boolean> {
    const result = await sql`
      DELETE FROM network_config WHERE id = ${id}
    `
    return (result.count || 0) > 0
  },

  // ============ DEVICE CONFIG ============

  async getDeviceConfig(deviceId: number): Promise<DeviceConfigRecord | null> {
    const [result] = await sql<DeviceConfigRecord[]>`
      SELECT * FROM device_config WHERE device_id = ${deviceId}
    `
    return (result as DeviceConfigRecord) || null
  },

  async getDevicesByNetwork(networkConfigId: number): Promise<any[]> {
    return await sql<any[]>`
      SELECT d.* FROM devices d
      INNER JOIN device_config dc ON d.id = dc.device_id
      WHERE dc.network_config_id = ${networkConfigId}
      ORDER BY d.device_name ASC
    `
  },

  async createDeviceConfig(
    deviceId: number,
    networkConfigId: number | null | undefined,
    config: any = {}
  ): Promise<DeviceConfigRecord> {
    const [result] = await sql<DeviceConfigRecord[]>`
      INSERT INTO device_config (device_id, network_config_id, config)
      VALUES (${deviceId}, ${networkConfigId || null}, ${config})
      ON CONFLICT (device_id) DO UPDATE 
      SET network_config_id = EXCLUDED.network_config_id,
          config = EXCLUDED.config,
          updated_at = NOW()
      RETURNING *
    `
    return result as DeviceConfigRecord
  },

  async updateDeviceConfig(
    deviceId: number,
    config: any
  ): Promise<DeviceConfigRecord | null> {
    const [result] = await sql<DeviceConfigRecord[]>`
      UPDATE device_config 
      SET config = ${config}, updated_at = NOW()
      WHERE device_id = ${deviceId}
      RETURNING *
    `
    return (result as DeviceConfigRecord) || null
  },

  async linkDeviceToNetwork(
    deviceId: number,
    networkConfigId: number
  ): Promise<DeviceConfigRecord | null> {
    const [result] = await sql<DeviceConfigRecord[]>`
      UPDATE device_config 
      SET network_config_id = ${networkConfigId}, updated_at = NOW()
      WHERE device_id = ${deviceId}
      RETURNING *
    `
    return (result as DeviceConfigRecord) || null
  },

  // ============ POINT CONFIG ============

  async getPointConfig(pointId: number): Promise<PointConfigRecord | null> {
    const [result] = await sql<PointConfigRecord[]>`
      SELECT * FROM point_config WHERE point_id = ${pointId}
    `
    return (result as PointConfigRecord) || null
  },

  async getPointsByDevice(deviceId: number): Promise<any[]> {
    return await sql<any[]>`
      SELECT p.* FROM points p
      WHERE p.device_id = ${deviceId}
      ORDER BY p.object_type, p.object_instance
    `
  },

  async createPointConfig(pointId: number, config: any = {}): Promise<PointConfigRecord> {
    const [result] = await sql<PointConfigRecord[]>`
      INSERT INTO point_config (point_id, config)
      VALUES (${pointId}, ${config})
      ON CONFLICT (point_id) DO UPDATE 
      SET config = EXCLUDED.config,
          updated_at = NOW()
      RETURNING *
    `
    return result as PointConfigRecord
  },

  async updatePointConfig(pointId: number, config: any): Promise<PointConfigRecord | null> {
    const [result] = await sql<PointConfigRecord[]>`
      UPDATE point_config 
      SET config = ${config}, updated_at = NOW()
      WHERE point_id = ${pointId}
      RETURNING *
    `
    return (result as PointConfigRecord) || null
  },

  // ============ BATCH OPERATIONS ============

  async getFullNetworkInfo(networkConfigId: number): Promise<{
    network: NetworkConfig | null
    devices: any[]
    points: any[]
  }> {
    const network = await this.getNetworkConfigById(networkConfigId)
    const devices = network ? await this.getDevicesByNetwork(networkConfigId) : []
    
    const points = []
    for (const device of devices) {
      const devicePoints = await this.getPointsByDevice(device.id)
      points.push(...devicePoints)
    }

    return { network, devices, points }
  },

  async getBacnetNetworkInfo(): Promise<{
    network: NetworkConfig | null
    devices: any[]
    points: any[]
  } | null> {
    const networks = await this.getNetworkConfigs('BACNET')
    if (networks.length === 0) return null
    
    return await this.getFullNetworkInfo(networks[0]!.id)
  },

  async getModbusNetworks(): Promise<Array<{
    network: NetworkConfig
    devices: any[]
  }>> {
    const networks = await this.getNetworkConfigs('MODBUS')
    const result = []
    
    for (const network of networks) {
      const devices = await this.getDevicesByNetwork(network.id)
      result.push({ network, devices })
    }
    
    return result
  }
}
