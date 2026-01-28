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
    // [VALIDATION] Check for Duplicates (BACnet only for now)
    if (protocol === 'BACNET') {
      const existingName = await sql`
            SELECT id FROM network_config 
            WHERE protocol = 'BACNET' AND name = ${name}
            LIMIT 1
        `;
      if (existingName.length > 0) {
        throw new Error(`Gateway name '${name}' is already taken.`);
      }

      const localDeviceId = config.localDeviceId;
      if (localDeviceId) {
        const existingId = await sql`
                SELECT id FROM network_config 
                WHERE protocol = 'BACNET' 
                AND config->>'localDeviceId' = ${localDeviceId.toString()}
                LIMIT 1
            `;
        if (existingId.length > 0) {
          throw new Error(`Local Device ID ${localDeviceId} is already used by another gateway.`);
        }
      }
    }

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

    // [VALIDATION] Check for Duplicates if Name or Config is changing
    // We need to know the protocol, assume we check duplicates against all or just BACnet?
    // ideally we should fetch the current config to know protocol, but simpler validation: 
    // Just check if name exists in ANY record != id.

    if (updates.name) {
      const existingName = await sql`
            SELECT id FROM network_config 
            WHERE name = ${updates.name} AND id != ${id}
            AND protocol = 'BACNET' -- Assuming we mostly care about BACnet duplicates
            LIMIT 1
        `;
      if (existingName.length > 0) {
        throw new Error(`Gateway name '${updates.name}' is already taken.`);
      }
    }

    if (updates.config && updates.config.localDeviceId) {
      const localDeviceId = updates.config.localDeviceId;
      const existingId = await sql`
            SELECT id FROM network_config 
            WHERE config->>'localDeviceId' = ${localDeviceId.toString()}
            AND id != ${id}
            AND protocol = 'BACNET'
            LIMIT 1
        `;
      if (existingId.length > 0) {
        throw new Error(`Local Device ID ${localDeviceId} is already used by another gateway.`);
      }
    }

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
      SELECT d.*, dc.config
      FROM devices d
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
      SELECT p.*, pc.config
      FROM points p
      LEFT JOIN point_config pc ON p.id = pc.point_id
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
    // [FIX] Get the LATEST enabled BACnet network
    // Previously it fetched all and took [0] (Oldest), so new configs didn't show up.
    const [latestNetwork] = await sql<NetworkConfig[]>`
      SELECT * FROM network_config 
      WHERE protocol = 'BACNET' AND enable = true
      ORDER BY created_at DESC 
      LIMIT 1
    `

    if (!latestNetwork) return null

    return await this.getFullNetworkInfo(latestNetwork.id)
  },

  async getAllBacnetNetworksInfo(): Promise<Array<{
    network: NetworkConfig
    devices: any[]
    points: any[]
  }>> {
    const networks = await sql<NetworkConfig[]>`
      SELECT * FROM network_config 
      WHERE protocol = 'BACNET' AND enable = true
      ORDER BY created_at ASC
    `

    // Process sequentially to be safe with DB connections
    const results = [];
    for (const net of networks) {
      const info = await this.getFullNetworkInfo(net.id);
      results.push(info);
    }
    return results as any;
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
