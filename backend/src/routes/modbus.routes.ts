// backend/src/routes/modbus.ts
import { Elysia, t } from 'elysia'
import { modbusService } from '../services/modbus.service'
import { getActorName } from '../utils/auth.utils'
import { sql } from '../db'

export const modbusRoutes = new Elysia({ prefix: '/modbus' })

  /**
   * POST /modbus/write-coil
   * เขียนค่า Coil (Boolean)
   */
  .post('/write-coil', async ({ body, request }) => {
    const { pointId, value } = body
    const userName = getActorName(request)
    
    try {
      await modbusService.writeCoil(pointId, value, userName)
      return { success: true, message: 'Coil written successfully' }
    } catch (error) {
      console.error('Write coil error:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Write failed' }
    }
  }, {
    body: t.Object({
      pointId: t.Number(),
      value: t.Boolean()
    })
  })

  /**
   * POST /modbus/write-register
   * เขียนค่า Holding Register (Number)
   */
  .post('/write-register', async ({ body, request }) => {
    const { pointId, value } = body
    const userName = getActorName(request)
    
    try {
      await modbusService.writeRegister(pointId, value, userName)
      return { success: true, message: 'Register written successfully' }
    } catch (error) {
      console.error('Write register error:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Write failed' }
    }
  }, {
    body: t.Object({
      pointId: t.Number(),
      value: t.Number()
    })
  })

  /**
   * POST /modbus/add-point
   * เพิ่ม Point ใหม่สำหรับ Modbus Device
   */
  .post('/add-point', async ({ body, request }) => {
    const { deviceId, pointName, registerType, address, dataType, dataFormat } = body
    const userName = getActorName(request)
    
    try {
      // ตรวจสอบว่ามี Point ที่ Address นี้อยู่แล้วหรือไม่
      const existing = await sql`
        SELECT id FROM points 
        WHERE device_id = ${deviceId} AND object_instance = ${address}
      `
      
      if (existing.length > 0) {
        return { success: false, message: 'Point at this address already exists' }
      }

        const [newPoint] = await sql`
        INSERT INTO points (
          device_id, object_type, object_instance, point_name, 
          register_type, data_type, data_format, is_monitor -- [UPDATED] เพิ่ม data_format
        ) VALUES (
          ${deviceId}, 'MODBUS_POINT', ${address}, ${pointName},
          ${registerType}, ${dataType || 'INT16'}, ${dataFormat || 'RAW'}, true
        )
        RETURNING *
      `

      // บันทึก Audit Log
      const { auditLogService } = await import('../services/audit-log.service')
      await auditLogService.recordLog({
        user_name: userName,
        action_type: 'SETTING',
        target_name: pointName,
        details: `Added Modbus point at address ${address}`,
        protocol: 'MODBUS'
      })

      return { success: true, point: newPoint }
    } catch (error) {
      console.error('Add point error:', error)
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to add point' 
      }
    }
  }, {
    body: t.Object({
      deviceId: t.Number(),
      pointName: t.String(),
      registerType: t.String(),
      address: t.Number(),
      dataType: t.Optional(t.String()),
      dataFormat: t.Optional(t.String())
    })
  })

  /**
   * DELETE /modbus/point/:id
   * ลบ Point
   */
  .delete('/point/:id', async ({ params, request }) => {
    const pointId = Number(params.id)
    const userName = getActorName(request)
    
    try {
      const [point] = await sql`
        SELECT point_name FROM points WHERE id = ${pointId}
      `
      
      if (!point) {
        return { success: false, message: 'Point not found' }
      }

      await sql`DELETE FROM points WHERE id = ${pointId}`

      // บันทึก Audit Log
      const { auditLogService } = await import('../services/audit-log.service')
      await auditLogService.recordLog({
        user_name: userName,
        action_type: 'SETTING',
        target_name: point.point_name,
        details: 'Deleted Modbus point',
        protocol: 'MODBUS'
      })

      return { success: true, message: 'Point deleted' }
    } catch (error) {
      return { success: false, message: 'Delete failed' }
    }
  })

  /**
   * POST /modbus/test-connection
   * ทดสอบการเชื่อมต่อกับ Device
   */
  .post('/test-connection', async ({ body }) => {
    const { ip, port, unitId } = body
    
    try {
      const isConnected = await modbusService.testConnection(ip, port || 502, unitId)
      return { 
        success: true, 
        connected: isConnected,
        message: isConnected ? 'Connection successful' : 'Connection failed'
      }
    } catch (error) {
      return { 
        success: false, 
        connected: false,
        message: error instanceof Error ? error.message : 'Test failed'
      }
    }
  }, {
    body: t.Object({
      ip: t.String(),
      port: t.Optional(t.Number()),
      unitId: t.Number()
    })
  })