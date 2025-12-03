/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Table, Tag, Button, Typography, Badge } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, ThunderboltOutlined, NumberOutlined } from '@ant-design/icons'
import { useEffect, useRef, useState } from 'react' // [UPDATED] เพิ่ม Hooks
import { AnimatedNumber } from '../../components/AnimatedNumber'

import type { Point, PointValue } from '../../types/common'

const { Text } = Typography

interface Props {
  points: Point[]
  pointValues: Map<number, PointValue>
  loading: boolean
  onWrite: (point: Point) => void
}

export const ModbusPointTable = ({ points, pointValues, loading, onWrite }: Props) => {
  // [UPDATED] 1. เพิ่ม State และ Ref สำหรับจัดการ Animation
  const [updatedPoints, setUpdatedPoints] = useState<Set<number>>(new Set())
  const previousValues = useRef<Map<number, any>>(new Map())

  // [UPDATED] 2. ตรวจสอบค่าที่เปลี่ยนไปเพื่อ Trigger Animation
  useEffect(() => {
    const newUpdated = new Set<number>()

    pointValues.forEach((value, pointId) => {
      const prevValue = previousValues.current.get(pointId)
      // ถ้ามีค่าเดิม และค่าใหม่ไม่เท่ากับค่าเดิม ให้ถือว่ามีการอัปเดต
      if (prevValue !== undefined && prevValue !== value.value) {
        newUpdated.add(pointId)
      }
      previousValues.current.set(pointId, value.value)
    })

    if (newUpdated.size > 0) {
      setUpdatedPoints(newUpdated)
      // ล้างสถานะ highlight ออกหลังจาก 800ms (เพื่อให้สีจางหายไป)
      setTimeout(() => setUpdatedPoints(new Set()), 800)
    }
  }, [pointValues])
  
  const columns: ColumnsType<Point> = [
    {
      title: 'Type',
      dataIndex: 'register_type',
      key: 'type',
      width: 150,
      render: (type: string | undefined) => {
        let color = 'default'
        let icon = <NumberOutlined />
        
        if (type === 'COIL') { color = 'green'; icon = <ThunderboltOutlined /> }
        if (type === 'HOLDING_REGISTER') { color = 'blue'; icon = <NumberOutlined /> }
        
        return <Tag color={color} icon={icon}>{type ?? 'UNKNOWN'}</Tag>
      }
    },
    {
      title: 'Address',
      dataIndex: 'object_instance',
      key: 'address',
      width: 100,
      render: (val) => <Text code>{val}</Text>
    },
    {
      title: 'Name',
      dataIndex: 'point_name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Value',
      key: 'value',
      width: 150,
      render: (_, record) => {
        const data = pointValues.get(record.id)
        // [UPDATED] 3. ตรวจสอบสถานะว่าต้อง Highlight หรือไม่
        const isUpdated = updatedPoints.has(record.id)

        // เตรียม Content ที่จะแสดง
        let content = <Badge status="default" text="-" />

        if (data) {
            if (record.register_type === 'COIL') {
                const isOn = data.value === true || data.value === 1 || data.value === 'true'
                content = (
                    <Badge 
                    status={isOn ? 'success' : 'default'} 
                    text={isOn ? 'ON' : 'OFF'} 
                    />
                )
            } else {
                content = (
                    <Text style={{ color: '#faad14', fontSize: 16 }}> {/* ใช้สีส้มเพื่อให้เข้ากับธีม Modbus */}
                        <AnimatedNumber value={Number(data.value)} decimals={0} />
                    </Text>
                )
            }
        }

        // [UPDATED] 4. หุ้ม Content ด้วย Div ที่มี Style เปลี่ยนสีพื้นหลัง
        return (
            <div
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                transition: "all 0.5s ease", // Animation fade
                // ถ้า isUpdated เป็น true ให้แสดงสีพื้นหลัง (สีส้มจางๆ)
                backgroundColor: isUpdated ? "rgba(250, 173, 20, 0.2)" : "transparent",
                border: isUpdated ? "1px solid rgba(250, 173, 20, 0.4)" : "1px solid transparent",
              }}
            >
              {content}
            </div>
        )
      }
    },
    {
      title: 'Action',
      key: 'action',
      align: 'center',
      width: 100,
      render: (_, record) => (
        <Button 
          size="small" 
          icon={<EditOutlined />} 
          onClick={() => onWrite(record)}
        />
      )
    }
  ]

  return (
    <Table
      columns={columns}
      dataSource={points}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 20 }}
    />
  )
}