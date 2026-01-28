/* eslint-disable @typescript-eslint/no-explicit-any */
import { authFetch } from '../utils/authFetch'

/**
 * Configuration Service - API client for new /config/* endpoints
 * 
 * This service handles all interactions with the refactored configuration architecture:
 * - network_config: Gateway/network settings (BACnet, Modbus)
 * - device_config: Device-to-network linkage and device-specific settings
 * - point_config: Point metadata and settings
 */

// ============= TYPES =============

export interface NetworkConfig {
  id: number
  name: string
  protocol: 'BACNET' | 'MODBUS'
  enable: boolean
  config: Record<string, any>
  created_at?: string
  updated_at?: string
}

export interface DeviceConfig {
  id: number
  device_id: number
  network_config_id?: number
  config: Record<string, any>
  updated_at?: string
}

export interface PointConfig {
  id: number
  point_id: number
  config: Record<string, any>
  updated_at?: string
}

export interface NetworkWithDevices extends NetworkConfig {
  devices?: any[]
  points?: any[]
}

export interface NetworkInterface {
  name: string
  ip: string
  mac: string
  type: string
}

// ============= NETWORK CONFIG OPERATIONS =============

/**
 * Get all networks, optionally filtered by protocol
 */
export const getNetworkConfigs = async (protocol?: 'BACNET' | 'MODBUS'): Promise<NetworkConfig[]> => {
  try {
    const url = protocol ? `/config/networks?protocol=${protocol}` : '/config/networks'
    const response = await authFetch(url)
    if (!response.ok) throw new Error(`Failed to fetch networks: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('getNetworkConfigs error:', error)
    throw error
  }
}

/**
 * Get a specific network by ID
 */
export const getNetworkConfigById = async (id: number): Promise<NetworkConfig> => {
  try {
    const response = await authFetch(`/config/networks/${id}`)
    if (!response.ok) throw new Error(`Network not found: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('getNetworkConfigById error:', error)
    throw error
  }
}

/**
 * Get network with all its devices and points
 */
export const getNetworkFullInfo = async (id: number): Promise<NetworkWithDevices> => {
  try {
    const response = await authFetch(`/config/networks/${id}/full-info`)
    if (!response.ok) throw new Error(`Failed to fetch network info: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('getNetworkFullInfo error:', error)
    throw error
  }
}

/**
 * Create a new network configuration
 */
export const createNetworkConfig = async (
  name: string,
  protocol: 'BACNET' | 'MODBUS',
  config: Record<string, any>,
  enable: boolean = true
): Promise<NetworkConfig> => {
  try {
    const response = await authFetch('/config/networks', {
      method: 'POST',
      body: JSON.stringify({ name, protocol, config, enable })
    })
    if (!response.ok) throw new Error(`Failed to create network: ${response.status}`)

    const data = await response.json()
    // [USER REQUEST] Handle 200 OK with error body
    if (data && data.status === 'failed') {
      throw new Error(data.message || 'Failed to create network')
    }
    return data
  } catch (error) {
    console.error('createNetworkConfig error:', error)
    throw error
  }
}

/**
 * Update a network configuration
 */
export const updateNetworkConfig = async (
  id: number,
  updates: Partial<NetworkConfig>
): Promise<NetworkConfig> => {
  try {
    const response = await authFetch(`/config/networks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
    if (!response.ok) throw new Error(`Failed to update network: ${response.status}`)

    const data = await response.json()
    // [USER REQUEST] Handle 200 OK with error body
    if (data && data.status === 'failed') {
      throw new Error(data.message || 'Failed to update network')
    }
    return data
  } catch (error) {
    console.error('updateNetworkConfig error:', error)
    throw error
  }
}

/**
 * Delete a network configuration
 */
export const deleteNetworkConfig = async (id: number): Promise<void> => {
  try {
    const response = await authFetch(`/config/networks/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error(`Failed to delete network: ${response.status}`)
  } catch (error) {
    console.error('deleteNetworkConfig error:', error)
    throw error
  }
}

// ============= BACNET SPECIFIC =============

/**
 * Get BACnet network configuration
 */
export const getBacnetNetwork = async (): Promise<Array<{ network: NetworkConfig; devices: any[]; points: any[] }>> => {
  try {
    const response = await authFetch('/config/bacnet/network')
    if (!response.ok) throw new Error(`Failed to fetch BACnet network: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('getBacnetNetwork error:', error)
    throw error
  }
}

// ============= MODBUS SPECIFIC =============

/**
 * Get all Modbus networks with their devices
 */
export const getModbusNetworks = async (): Promise<NetworkWithDevices[]> => {
  try {
    const response = await authFetch('/config/modbus/networks')
    if (!response.ok) throw new Error(`Failed to fetch Modbus networks: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('getModbusNetworks error:', error)
    throw error
  }
}

// ============= DEVICE CONFIG OPERATIONS =============

/**
 * Get device configuration
 */
export const getDeviceConfig = async (deviceId: number): Promise<DeviceConfig | null> => {
  try {
    const response = await authFetch(`/config/devices/${deviceId}`)
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`Failed to fetch device config: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('getDeviceConfig error:', error)
    throw error
  }
}

/**
 * Create device configuration
 */
export const createDeviceConfig = async (
  deviceId: number,
  networkConfigId: number | null,
  config: Record<string, any> = {}
): Promise<DeviceConfig> => {
  try {
    const response = await authFetch(`/config/devices/${deviceId}`, {
      method: 'POST',
      body: JSON.stringify({ network_config_id: networkConfigId, config })
    })
    if (!response.ok) throw new Error(`Failed to create device config: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('createDeviceConfig error:', error)
    throw error
  }
}

/**
 * Update device configuration
 */
export const updateDeviceConfig = async (
  deviceId: number,
  config: Partial<DeviceConfig>
): Promise<DeviceConfig> => {
  try {
    const response = await authFetch(`/config/devices/${deviceId}`, {
      method: 'PUT',
      body: JSON.stringify(config)
    })
    if (!response.ok) throw new Error(`Failed to update device config: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('updateDeviceConfig error:', error)
    throw error
  }
}

/**
 * Link device to a network
 */
export const linkDeviceToNetwork = async (
  deviceId: number,
  networkConfigId: number | null
): Promise<DeviceConfig> => {
  try {
    const response = await authFetch(`/config/devices/${deviceId}/network`, {
      method: 'PUT',
      body: JSON.stringify({ network_config_id: networkConfigId })
    })
    if (!response.ok) throw new Error(`Failed to link device: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('linkDeviceToNetwork error:', error)
    throw error
  }
}

// ============= POINT CONFIG OPERATIONS =============

/**
 * Get point configuration
 */
export const getPointConfig = async (pointId: number): Promise<PointConfig | null> => {
  try {
    const response = await authFetch(`/config/points/${pointId}`)
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`Failed to fetch point config: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('getPointConfig error:', error)
    throw error
  }
}

/**
 * Create point configuration
 */
export const createPointConfig = async (
  pointId: number,
  config: Record<string, any> = {}
): Promise<PointConfig> => {
  try {
    const response = await authFetch(`/config/points/${pointId}`, {
      method: 'POST',
      body: JSON.stringify({ config })
    })
    if (!response.ok) throw new Error(`Failed to create point config: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('createPointConfig error:', error)
    throw error
  }
}

/**
 * Update point configuration
 */
export const updatePointConfig = async (
  pointId: number,
  config: Record<string, any>
): Promise<PointConfig> => {
  try {
    const response = await authFetch(`/config/points/${pointId}`, {
      method: 'PUT',
      body: JSON.stringify({ config })
    })
    if (!response.ok) throw new Error(`Failed to update point config: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('updatePointConfig error:', error)
    throw error
  }
}
// ============= NETWORK INTERFACES =============

/**
 * Get available network interfaces for gateway configuration
 */
export const getNetworkInterfaces = async (): Promise<NetworkInterface[]> => {
  try {
    const response = await authFetch('/settings/interfaces')
    if (!response.ok) throw new Error(`Failed to fetch network interfaces: ${response.status}`)
    const interfaces = await response.json()

    // Check if response is array of objects (new format) or array of strings (legacy)
    if (interfaces.length > 0 && typeof interfaces[0] === 'object') {
      // Already in correct format with ip, mac, type
      return interfaces
    } else if (interfaces.length > 0 && typeof interfaces[0] === 'string') {
      // Legacy format - convert strings to NetworkInterface objects
      return interfaces.map((name: string) => ({
        name,
        ip: 'N/A',
        mac: 'N/A',
        type: 'unknown'
      }))
    }

    return []
  } catch (error) {
    console.error('getNetworkInterfaces error:', error)
    throw error
  }
}