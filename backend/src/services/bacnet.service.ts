import os from 'os'
import type {
  BacnetNodeDto,
  BacnetPointDto,
  MonitorValueDto,
  ReadRequestDto,
  WriteRequestDto,
  BacnetDriverConfig
} from '../dtos/bacnet.dto'
import { sql } from '../db'
import { configService } from './config.service'
import { BacnetClient } from './bacnet/bacnet-client'

// Multi-Gateway support: configId -> BacnetClient
const clients = new Map<number, BacnetClient>();
// Default client (fallback)
let defaultClient: BacnetClient | null = null;
let isInitializing = false;

// === Utility for IP Math ===
function ipToLong(ip: string): number {
  let ipl = 0;
  ip.split('.').forEach((octet) => {
    ipl <<= 8;
    ipl += parseInt(octet);
  });
  return (ipl >>> 0);
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

// Initialize ALL clients from DB
async function initializeClients() {
  if (isInitializing) return;
  isInitializing = true;

  try {
    const networks = await configService.getNetworkConfigs('BACNET');
    console.log(`[BACnet] Finding ${networks.length} network configurations...`);

    // Close detached clients? Ideally we should diff, but for now let's just create new ones or update
    // Simple strategy: Clear old map if we want full refresh, or just add new ones.
    // Let's rely on map.set replacing old keys.

    for (const net of networks) {
      // Check if client exists
      if (clients.has(net.id)) continue;

      const config = net.config || {};
      const rawInterface = config.ip || config.interface || '0.0.0.0';
      const bacnetPort = config.port || 47808;
      const apduTimeout = config.apduTimeout || 6000;

      let bacnetInterface = '0.0.0.0';
      const ifaceInfo = getInterfaceInfo(rawInterface);

      if (ifaceInfo) {
        bacnetInterface = ifaceInfo.ip;
        console.log(`[BACnet] Network ${net.name} (ID: ${net.id}) resolved to IP: ${bacnetInterface}`);
      } else if (rawInterface === '0.0.0.0') {
        bacnetInterface = '0.0.0.0';
      } else {
        console.warn(`[BACnet] Network ${net.name}: Could not resolve interface '${rawInterface}', fallback to 0.0.0.0`);
        bacnetInterface = '0.0.0.0';
      }

      console.log(`[BACnet] Creating Client for Network ID ${net.id} on ${bacnetInterface}:${bacnetPort}`);
      const client = new BacnetClient({
        port: bacnetPort,
        interface: bacnetInterface,
        apduTimeout: apduTimeout,
        apduSize: 1476
      });

      clients.set(net.id, client);

      // Set first one as default if not set
      if (!defaultClient) {
        defaultClient = client;
      }
    }

    // If no networks, maybe create a default legacy one?
    if (clients.size === 0 && !defaultClient) {
      console.log('[BACnet] No config found, creating default listener on 0.0.0.0');
      defaultClient = new BacnetClient({
        port: 47808,
        interface: '0.0.0.0',
        apduTimeout: 6000,
        apduSize: 1476
      });
    }

  } catch (err) {
    console.error('[BACnet] Failed to initialize clients:', err);
  } finally {
    isInitializing = false;
  }
}

// Helper to get client by specific network ID
async function getClientForDeviceWithNetworkId(networkId: number): Promise<BacnetClient | undefined> {
  if (clients.size === 0) {
    await initializeClients();
  }
  return clients.get(networkId);
}

// Get Client for a specific Device
async function getClientForDevice(deviceId?: number): Promise<BacnetClient> {
  if (clients.size === 0) {
    await initializeClients();
  }

  if (!deviceId) return defaultClient!;

  try {
    const deviceConfig = await configService.getDeviceConfig(deviceId);
    if (deviceConfig && deviceConfig.network_config_id && clients.has(deviceConfig.network_config_id)) {
      return clients.get(deviceConfig.network_config_id)!;
    }
  } catch (e) { /* ignore */ }

  // Fallback to default
  return defaultClient!;
}

// Helper to get ALL clients (for WhoIs broadcast on all networks)
async function getAllClients(): Promise<BacnetClient[]> {
  if (clients.size === 0) await initializeClients();
  const list = Array.from(clients.values());
  if (list.length === 0 && defaultClient) return [defaultClient];
  return list;
}


// Helper Map (Reverse) - Supports both with and without OBJECT_ prefix
const typeNameToId: Record<string, number> = {
  'ANALOG_INPUT': 0, 'OBJECT_ANALOG_INPUT': 0,
  'ANALOG_OUTPUT': 1, 'OBJECT_ANALOG_OUTPUT': 1,
  'ANALOG_VALUE': 2, 'OBJECT_ANALOG_VALUE': 2,
  'BINARY_INPUT': 3, 'OBJECT_BINARY_INPUT': 3,
  'BINARY_OUTPUT': 4, 'OBJECT_BINARY_OUTPUT': 4,
  'BINARY_VALUE': 5, 'OBJECT_BINARY_VALUE': 5,
  'DEVICE': 8, 'OBJECT_DEVICE': 8,
  'MULTI_STATE_INPUT': 13, 'OBJECT_MULTI_STATE_INPUT': 13,
  'MULTI_STATE_OUTPUT': 14, 'OBJECT_MULTI_STATE_OUTPUT': 14,
  'MULTI_STATE_VALUE': 19, 'OBJECT_MULTI_STATE_VALUE': 19,
  'CHARACTERSTRING_VALUE': 40, 'OBJECT_CHARACTERSTRING_VALUE': 40,
  'LARGE_ANALOG_VALUE': 46, 'OBJECT_LARGE_ANALOG_VALUE': 46,
};

function getTypeId(type: string | number): number {
  if (typeof type === 'number') return type;
  const upper = type.toUpperCase();
  const exactMatch = typeNameToId[upper];
  if (exactMatch !== undefined) return exactMatch;

  // Try stripping OBJECT_ if not found
  if (upper.startsWith('OBJECT_')) {
    const stripped = upper.replace('OBJECT_', '');
    const strippedMatch = typeNameToId[stripped];
    if (strippedMatch !== undefined) return strippedMatch;
  }

  // Fallback: try parsing number
  const sent = parseInt(type as string);
  if (!isNaN(sent)) return sent;
  return 0; // Default or throw?
}


export const bacnetService = {

  // 1. Discovery (Native WhoIs) - Broadcast on ALL interfaces
  async discoverDevices(timeout: number = 3): Promise<{ devices: BacnetNodeDto[], scanningPort: number }> {
    try {
      console.log(`🔍 [BACNET] Discovery (Native) with timeout=${timeout}s...`)

      const activeClients = await getAllClients();
      const scanningPort = 47808;
      const foundDevices: Map<string, BacnetNodeDto> = new Map();

      return new Promise((resolve) => {
        // Setup listener for each client
        activeClients.forEach(client => {
          const nodeClient = client.getClient();

          const onIAm = (device: any) => {
            // console.log('DEBUG: IAm device payload:', JSON.stringify(device, null, 2));

            const address = device.address
              || device.payload?.address
              || (device.header && device.header.address)
              || (device.header && device.header.sender && device.header.sender.address);

            const deviceId = device.deviceId || device.payload?.deviceId;
            const vendorId = device.vendorId || device.payload?.vendorId;

            if (!foundDevices.has(deviceId)) {
              foundDevices.set(deviceId, {
                address: address + ":" + scanningPort, // Format IP:Port
                deviceId: deviceId,
                // We might not get name immediately in I-Am, might need to read it later or leave blank
                name: `Device ${deviceId}`,
                vendorId: vendorId,
                status: 'online',
                networkNumber: 0, // Simplified
                lastSeen: new Date().toISOString()
              } as any);
            }
          };

          nodeClient.on('iAm', onIAm);

          // Send WhoIs
          client.whoIs();

          // Cleanup
          setTimeout(() => {
            nodeClient.off('iAm', onIAm);
          }, timeout * 1000);
        });

        // Wait and Resolve
        setTimeout(() => {
          // Flatten results
          resolve({
            devices: Array.from(foundDevices.values()),
            scanningPort: scanningPort
          });
        }, timeout * 1000);
      });

    } catch (error) {
      console.error('❌ Discovery Failed:', error)
      return { devices: [], scanningPort: 47808 }
    }
  },

  // 2. Get Objects (Read ObjectList)
  async getObjects(deviceId: number): Promise<BacnetPointDto[]> {
    try {
      // For getting objects, we need the device's IP.
      // [FIX] Use getClientForDevice logic to ensure we are on the right network
      const deviceConfig = await configService.getDeviceConfig(deviceId);

      const [deviceRecord] = await sql<any[]>`SELECT * FROM devices WHERE device_instance_id = ${deviceId} OR id = ${deviceId} LIMIT 1`;

      if (!deviceRecord) {
        throw new Error(`Device ${deviceId} not found in DB`);
      }

      const ip = deviceRecord.ip_address; // Assuming column is ip_address
      if (!ip) throw new Error(`Device ${deviceId} has no IP address`);

      // Resolve correct client
      const client = await getClientForDevice(deviceRecord.id);

      // Read Object List (Property ID 76) of Device Object (Type 8, Instance = deviceId)
      const values = await client.readProperty(ip, 8, deviceRecord.device_instance_id, 76);

      // console.log('DEBUG: getObjects values:', JSON.stringify(values, null, 2));

      const validList = Array.isArray(values) ? values : (values && Array.isArray(values.values) ? values.values : []);

      if (!validList || validList.length === 0) {
        return [];
      }

      return validList.map((obj: { value: any }) => {
        const item = obj.value || obj; // Fallback

        // Convert Type ID to String for compatibility
        // [FIX] Add OBJECT_ prefix to match valid structure for Frontend
        const typeMap: Record<number, string> = {
          0: 'OBJECT_ANALOG_INPUT',
          1: 'OBJECT_ANALOG_OUTPUT',
          2: 'OBJECT_ANALOG_VALUE',
          3: 'OBJECT_BINARY_INPUT',
          4: 'OBJECT_BINARY_OUTPUT',
          5: 'OBJECT_BINARY_VALUE',
          8: 'OBJECT_DEVICE',
          13: 'OBJECT_MULTI_STATE_INPUT',
          14: 'OBJECT_MULTI_STATE_OUTPUT',
          19: 'OBJECT_MULTI_STATE_VALUE',
          40: 'OBJECT_CHARACTERSTRING_VALUE',
          46: 'OBJECT_LARGE_ANALOG_VALUE'
        };
        const typeStr = typeMap[item.type] || `OBJECT_TYPE_${item.type}`;

        return {
          instance: item.instance,
          objectType: typeStr,
          name: `${typeStr.replace('OBJECT_', '')}:${item.instance}`
        };
      });

    } catch (error) {
      console.error(`❌ Get Objects Failed for device ${deviceId}:`, error);
      return [];
    }
  },

  // 3. Read Multiple (Monitor)
  async readMultiple(points: ReadRequestDto[]): Promise<MonitorValueDto[]> {
    try {
      // Group points by deviceId to batch requests per client? 
      // Current implementation is simple: request one by one. getClientForDevice is async but fast.

      const promises = points.map(async (p) => {
        try {
          if (!p.ip) {
            return null;
          }

          const client = await getClientForDevice(p.deviceId);
          const typeId = getTypeId(p.objectType);
          const val = await client.readProperty(p.ip, typeId, p.instance, p.propertyId || 85);

          let actualValue = val;
          if (val && val.values && val.values[0]) {
            actualValue = val.values[0].value;
          }

          return {
            deviceId: p.deviceId,
            objectType: p.objectType, // Return as passed
            instance: p.instance,
            propertyId: p.propertyId || 85,
            value: actualValue,
            status: 'ok'
          } as MonitorValueDto;

        } catch (err) {
          return {
            deviceId: p.deviceId,
            objectType: p.objectType,
            instance: p.instance,
            propertyId: p.propertyId || 85,
            value: null,
            status: 'error'
          } as MonitorValueDto;
        }
      });

      const results = await Promise.all(promises);
      return results.filter(r => r !== null) as MonitorValueDto[];

    } catch (error) {
      console.error('❌ Read Multiple Failed:', error);
      return [];
    }
  },

  // 4. Write Value
  async writeProperty(req: WriteRequestDto): Promise<boolean> {
    try {
      const client = await getClientForDevice(req.deviceId);

      let ip = req.ip;
      if (!ip) {
        // Look up device
        const [dev] = await sql<any[]>`SELECT ip_address FROM devices WHERE id = ${req.deviceId} OR device_instance_id = ${req.deviceId}`;
        if (dev) ip = dev.ip_address;
      }

      if (!ip) throw new Error('Target device IP not found');

      const typeId = getTypeId(req.objectType);

      // ---------------------------------------------------------
      // [FIX] Prepare Value with correct Application Tag
      // ---------------------------------------------------------
      const valueList: any[] = [];
      const priority = req.priority || 16; // Default to 16

      // Case: Relinquish (Null Value)
      if (req.value === null || req.value === 'null') {
        valueList.push({
          type: 0, // BACNET_APPLICATION_TAG_NULL
          value: null
        });
      }
      else {
        // Convert value based on Object Type (Analog, Binary, Multi-state)
        const objectTypeStr = req.objectType.toString().toUpperCase();

        // Case: ANALOG (AO, AV) + INPUT (AI) -> Use REAL (Tag 4)
        if (objectTypeStr.includes('ANALOG') || typeId === 1 || typeId === 2 || typeId === 0) {
          valueList.push({
            type: 4, // BACNET_APPLICATION_TAG_REAL
            value: parseFloat(req.value as string)
          });
        }
        // Case: BINARY (BO, BV) + INPUT (BI) -> Use ENUMERATED (Tag 9)
        else if (objectTypeStr.includes('BINARY') || typeId === 4 || typeId === 5 || typeId === 3) {
          // Convert true/false/'1'/'0' to 0 or 1
          const numVal = (req.value === true || req.value === 'true' || req.value == 1) ? 1 : 0;
          valueList.push({
            type: 9, // BACNET_APPLICATION_TAG_ENUMERATED
            value: numVal
          });
        }
        // Case: MULTI_STATE (MO, MV) + INPUT (MI) -> Use UNSIGNED_INT (Tag 2)
        else if (objectTypeStr.includes('MULTI_STATE') || typeId === 14 || typeId === 19 || typeId === 13) {
          valueList.push({
            type: 2, // BACNET_APPLICATION_TAG_UNSIGNED_INT
            value: parseInt(req.value as string)
          });
        }
        // Case: CHARACTERSTRING -> Use CHARACTER_STRING (Tag 7)
        else if (objectTypeStr.includes('STRING') || typeId === 40) {
          valueList.push({
            type: 7, // BACNET_APPLICATION_TAG_CHARACTER_STRING
            value: String(req.value)
          });
        }
        // Case: LARGE_ANALOG_VALUE -> Use DOUBLE (Tag 5)
        else if (objectTypeStr.includes('LARGE') || typeId === 46) {
          valueList.push({
            type: 5, // BACNET_APPLICATION_TAG_DOUBLE
            value: parseFloat(req.value as string)
          });
        }
        // Fallback -> Default to Real if unknown
        else {
          valueList.push({
            type: 4,
            value: req.value
          });
        }
      }

      // [STRATEGY] Unified Write Logic (Strict Priority)
      // We always send priority (Default 16) because our strategy targets Commandable Objects.
      // If writing to a non-commandable object (which rejects priority), 
      // the user must configure the device/simulator correctly (e.g. use AnalogValueCmdObject).

      console.log(`[BACnet] Writing to ${ip} (Instance ${req.instance}) with Priority ${priority}`);

      try {
        await client.writeProperty(ip, typeId, req.instance, req.propertyId || 85, valueList, priority);
        console.log(`[BACnet] Write Success.`);
      } catch (err: any) {
        console.error(`[BACnet] Write Failed: ${err.message}`);
        throw err;
      }

      return true;

    } catch (error: any) {
      console.error('❌ Write Failed:', error)
      throw new Error(`Write Failed: ${error.message}`);
    }
  }
}
