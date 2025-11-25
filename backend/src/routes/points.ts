import { Elysia, t } from 'elysia'
import { sql } from '../db'
import { bacnetService } from '../services/bacnet.service'
import type { WriteRequestDto } from '../dtos/bacnet.dto'

export const pointsRoutes = new Elysia({ prefix: '/points' })

  // 1. ดึงรายชื่อ Points
  .get('/:deviceId', async ({ params: { deviceId } }) => {
    const rows = await sql`
      SELECT * FROM points 
      WHERE device_id = ${deviceId} 
      ORDER BY object_type, object_instance
    `
    return [...rows]
  })

  // 2. Sync ข้อมูล
  .post('/sync', async ({ body }) => {
    // ... (โค้ด Sync เดิม ไม่ต้องแก้) ...
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

  // 3. [FIXED] เขียนค่า (Write Value) รับ pointId แทน objectType/instance
  .post('/write', async ({ body }) => {
    // รับ pointId จาก Frontend
    const { deviceId, pointId, value, priority } = body 
    
    // 1. หา Device Instance ID
    const [device] = await sql`SELECT device_instance_id FROM devices WHERE id = ${deviceId}`
    if (!device) throw new Error('Device not found')

    // 2. [NEW] หา Object Type และ Instance จาก pointId ใน DB
    const [point] = await sql`SELECT object_type, object_instance FROM points WHERE id = ${pointId}`
    if (!point) throw new Error('Point not found in database')

    // 3. สร้าง Request ส่งให้ Service
    const bacnetRequest: WriteRequestDto = {
        deviceId: device.device_instance_id,
        objectType: point.object_type,      // ได้จาก DB แล้ว
        instance: point.object_instance,    // ได้จาก DB แล้ว
        propertyId: 'PROP_PRESENT_VALUE',
        value: value,
        priority: priority
    }

    const success = await bacnetService.writeProperty(bacnetRequest)
    
    if (success) {
        return { success: true, message: 'Write command sent successfully' }
    } else {
        throw new Error('Failed to write value')
    }
  }, {
    // [IMPORTANT] แก้ Validation ให้ตรงกับที่ Frontend ส่งมา
    body: t.Object({
        deviceId: t.Number(),
        pointId: t.Number(),        // เปลี่ยนจาก objectType, instance เป็น pointId
        value: t.Any(),
        priority: t.Optional(t.Number())
    })
  })