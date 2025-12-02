import { Table, Button, Badge, Typography, Tag, Space, Popconfirm } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EyeOutlined, GlobalOutlined } from '@ant-design/icons'

const { Text } = Typography

interface ModbusDevice {
  id: number
  device_name: string
  ip_address: string
  port?: number // ปกติมาจาก DB หรือถ้าไม่มีใช้ Default
  unit_id?: number
  is_active?: boolean
}

interface Props {
  devices: ModbusDevice[]
  loading: boolean
  onView: (device: ModbusDevice) => void
  onDelete: (id: number) => void
}

export const ModbusDeviceTable = ({ devices, loading, onView, onDelete }: Props) => {
  const columns: ColumnsType<ModbusDevice> = [
    {
      title: 'Status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Badge 
          status={record.is_active ? 'success' : 'default'} 
          text={record.is_active ? 'Online' : 'Offline'} 
        />
      )
    },
    {
      title: 'Device Name',
      dataIndex: 'device_name',
      key: 'device_name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Connection',
      key: 'connection',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Tag icon={<GlobalOutlined />} color="blue">
            {record.ip_address} : {record.port || 502}
          </Tag>
        </Space>
      )
    },
    {
      title: 'Unit ID',
      dataIndex: 'unit_id',
      key: 'unit_id',
      align: 'center',
      render: (val) => <Tag>{val}</Tag>
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right',
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            ghost 
            icon={<EyeOutlined />} 
            onClick={() => onView(record)}
          >
            Points
          </Button>
          <Popconfirm
            title="Delete Device"
            description="Are you sure to delete this device?"
            onConfirm={() => onDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <Table
      columns={columns}
      dataSource={devices}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 10 }}
    />
  )
}