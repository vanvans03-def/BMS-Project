import { Elysia, t } from 'elysia'
import { configService } from '../services/config.service'

export const configRoutes = new Elysia({ prefix: '/config' })

  // ============ NETWORK CONFIG ROUTES ============

  .get('/networks', async ({ query }) => {
    const protocol = query.protocol as 'BACNET' | 'MODBUS' | undefined
    return await configService.getNetworkConfigs(protocol)
  }, {
    query: t.Object({
      protocol: t.Optional(t.String())
    })
  })

  .get('/networks/:id', async ({ params }) => {
    const network = await configService.getNetworkConfigById(Number(params.id))
    if (!network) {
      throw new Error('Network config not found')
    }
    return network
  })

  .post('/networks', async ({ body, set }) => {
    try {
      return await configService.createNetworkConfig(
        body.name,
        body.protocol,
        body.config,
        body.enable
      )
    } catch (e: any) {
      console.error('Error creating network:', e);
      if (e.message.includes('already taken') || e.message.includes('already used')) {
        // [USER REQUEST] Return 200 OK but with status failed
        set.status = 200;
        return { status: 'failed', message: e.message };
      }
      throw e;
    }
  }, {
    body: t.Object({
      name: t.String(),
      protocol: t.Union([t.Literal('BACNET'), t.Literal('MODBUS')]),
      config: t.Object({}, { additionalProperties: true }),
      enable: t.Optional(t.Boolean())
    })
  })

  .put('/networks/:id', async ({ params, body, set }) => {
    try {
      const network = await configService.updateNetworkConfig(Number(params.id), body as any)
      if (!network) {
        set.status = 404;
        return { error: 'Network config not found' };
      }
      return network
    } catch (e: any) {
      console.error('Error updating network:', e);
      if (e.message.includes('already taken') || e.message.includes('already used')) {
        // [USER REQUEST] Return 200 OK but with status failed
        set.status = 200;
        return { status: 'failed', message: e.message };
      }
      throw e;
    }
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      config: t.Optional(t.Object({}, { additionalProperties: true })),
      enable: t.Optional(t.Boolean())
    }, { additionalProperties: true })
  })

  .delete('/networks/:id', async ({ params }) => {
    const success = await configService.deleteNetworkConfig(Number(params.id))
    if (!success) {
      throw new Error('Network config not found')
    }
    return { success: true }
  })

  .get('/networks/:id/full-info', async ({ params }) => {
    return await configService.getFullNetworkInfo(Number(params.id))
  })

  // ============ BACNET NETWORK ============

  .get('/bacnet/network', async () => {
    return await configService.getAllBacnetNetworksInfo()
  })

  // ============ MODBUS NETWORKS ============

  .get('/modbus/networks', async () => {
    return await configService.getModbusNetworks()
  })

  // ============ DEVICE CONFIG ROUTES ============

  .get('/devices/:deviceId', async ({ params }) => {
    const deviceConfig = await configService.getDeviceConfig(Number(params.deviceId))
    if (!deviceConfig) {
      throw new Error('Device config not found')
    }
    return deviceConfig
  })

  .post('/devices/:deviceId', async ({ params, body }) => {
    return await configService.createDeviceConfig(
      Number(params.deviceId),
      body.network_config_id ?? null,
      body.config
    )
  }, {
    body: t.Object({
      network_config_id: t.Optional(t.Nullable(t.Number())),
      config: t.Optional(t.Object({}, { additionalProperties: true }))
    })
  })

  .put('/devices/:deviceId', async ({ params, body }) => {
    const deviceConfig = await configService.updateDeviceConfig(
      Number(params.deviceId),
      body.config
    )
    if (!deviceConfig) {
      throw new Error('Device config not found')
    }
    return deviceConfig
  }, {
    body: t.Object({
      config: t.Object({}, { additionalProperties: true })
    })
  })

  .put('/devices/:deviceId/network', async ({ params, body }) => {
    const deviceConfig = await configService.linkDeviceToNetwork(
      Number(params.deviceId),
      body.network_config_id
    )
    if (!deviceConfig) {
      throw new Error('Device config not found')
    }
    return deviceConfig
  }, {
    body: t.Object({
      network_config_id: t.Number()
    })
  })

  // ============ POINT CONFIG ROUTES ============

  .get('/points/:pointId', async ({ params }) => {
    const pointConfig = await configService.getPointConfig(Number(params.pointId))
    if (!pointConfig) {
      throw new Error('Point config not found')
    }
    return pointConfig
  })

  .post('/points/:pointId', async ({ params, body }) => {
    return await configService.createPointConfig(
      Number(params.pointId),
      body.config
    )
  }, {
    body: t.Object({
      config: t.Optional(t.Object({}, { additionalProperties: true }))
    })
  })

  .put('/points/:pointId', async ({ params, body }) => {
    const pointConfig = await configService.updatePointConfig(
      Number(params.pointId),
      body.config
    )
    if (!pointConfig) {
      throw new Error('Point config not found')
    }
    return pointConfig
  }, {
    body: t.Object({
      config: t.Object({}, { additionalProperties: true })
    })
  })
