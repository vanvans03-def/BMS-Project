/* eslint-disable react-hooks/set-state-in-effect */
import { Table, Tag, Button, Typography, Badge } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, ThunderboltOutlined, NumberOutlined } from '@ant-design/icons'
import { AnimatedNumber } from '../../components/AnimatedNumber'

// [UPDATED] Import Type กลาง
import type { Point, PointValue } from '../../types/common'

const { Text } = Typography

// [REMOVED] ลบ interface Point ภายในทิ้ง
// interface Point { ... }
// interface PointValue { ... }

interface Props {
  points: Point[]
  pointValues: Map<number, PointValue>
  loading: boolean
  onWrite: (point: Point) => void
}

export const ModbusPointTable = ({ points, pointValues, loading, onWrite }: Props) => {
  
  const columns: ColumnsType<Point> = [
    {
      title: 'Type',
      dataIndex: 'register_type',
      key: 'type',
      width: 150,
      render: (type: string | undefined) => { // [UPDATED] รองรับ undefined
        let color = 'default'
        let icon = <NumberOutlined />
        
        // ตรวจสอบค่า type ก่อนใช้งาน
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
        if (!data) return <Badge status="default" text="-" />

        // [UPDATED] ใช้ optional chaining หรือตรวจสอบค่าก่อน
        if (record.register_type === 'COIL') {
           const isOn = data.value === true || data.value === 1 || data.value === 'true'
           return (
             <Badge 
               status={isOn ? 'success' : 'default'} 
               text={isOn ? 'ON' : 'OFF'} 
             />
           )
        }

        return (
          <Text style={{ color: '#1890ff', fontSize: 16 }}>
             <AnimatedNumber value={Number(data.value)} decimals={0} />
          </Text>
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