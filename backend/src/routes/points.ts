import { Elysia, t } from 'elysia'
import { sql } from '../db'
import { bacnetService } from '../services/bacnet.service'
import { auditLogService } from '../services/audit-log.service' // [NEW] Import
import type { WriteRequestDto } from '../dtos/bacnet.dto'

export const pointsRoutes = new Elysia({ prefix: '/points' })

  // 1. ดึงรายชื่อ Points (เหมือนเดิม)
  .get('/:deviceId', async ({ params: { deviceId } }) => {
    const rows = await sql`
      SELECT * FROM points 
      WHERE device_id = ${deviceId} 
      ORDER BY object_type, object_instance
    `
    return [...rows]
  })

  // 2. Sync ข้อมูล (เหมือนเดิม)
  .post('/sync', async ({ body }) => {
    const { deviceId } = body as { deviceId: number }
    const [device] = await sql`SELECT * FROM devices WHERE id = ${deviceId}`
    if (!device) throw new Error('Device not found')
    const objects = await bacnetService.getObjects(device.device_instance_id)
    if (objects.length === 0) return { success: false, message: 'No objects' }
    await sql`DELETE FROM points WHERE device_id = ${deviceId}`
    const pointsToInsert = objects.map(obj => ({
      device_id: deviceId,
      object_type: obj.objectType,
      object_instance: obj.instance,
      point_name: `${obj.objectType}_${obj.instance}`,
      is_monitor: true
    }))
    const result = await sql`INSERT INTO points ${sql(pointsToInsert)} RETURNING *`
    return { success: true, count: result.length, points: result }
  }, {
    body: t.Object({ deviceId: t.Number() })
  })

  // 3. [MODIFIED] เขียนค่า และบันทึก Log
  .post('/write', async ({ body }) => {
    const { deviceId, pointId, value, priority } = body 
    
    // 1. หา Device
    const [device] = await sql`SELECT device_instance_id, device_name FROM devices WHERE id = ${deviceId}`
    if (!device) throw new Error('Device not found')

    // 2. หา Point (ดึง value เก่ามาด้วย ถ้าทำได้ แต่ใน DB เราไม่มี value ล่าสุดเก็บไว้ งั้น log แค่ค่าใหม่)
    const [point] = await sql`SELECT object_type, object_instance, point_name FROM points WHERE id = ${pointId}`
    if (!point) throw new Error('Point not found in database')

    // 3. ส่งคำสั่ง BACnet
    const bacnetRequest: WriteRequestDto = {
        deviceId: device.device_instance_id,
        objectType: point.object_type,
        instance: point.object_instance,
        propertyId: 'PROP_PRESENT_VALUE',
        value: value,
        priority: priority
    }

    const success = await bacnetService.writeProperty(bacnetRequest)
    
    if (success) {
        // [NEW] ✅ บันทึก Audit Log เมื่อเขียนสำเร็จ
        // ในระบบจริง user_name ควรมาจาก Token/Session ตอนนี้ Hardcode ไปก่อน
        const userName = 'Admin' 
        
        await auditLogService.recordLog({
            user_name: userName,
            action_type: 'WRITE',
            target_name: point.point_name,
            details: `Set value to ${value} (Priority: ${priority || 8})`
        })

        return { success: true, message: 'Write command sent successfully' }
    } else {
        throw new Error('Failed to write value')
    }
  }, {
    body: t.Object({
        deviceId: t.Number(),
        pointId: t.Number(),
        value: t.Any(),
        priority: t.Optional(t.Number())
    })
  })