import { Table, Button, Badge, Typography, Tag, Space, Popconfirm, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EyeOutlined, GlobalOutlined, SettingOutlined, ThunderboltOutlined } from '@ant-design/icons'
import type { Device } from '../../types/common'

const { Text } = Typography

interface Props {
  devices: Device[]
  loading: boolean
  defaultPollingInterval: number
  onView: (device: Device) => void
  onDelete: (id: number) => void
  onEditPolling: (device: Device) => void // [NEW] Callback สำหรับกดแก้ไข
}

export const ModbusDeviceTable = ({ devices, loading, defaultPollingInterval, onView, onDelete, onEditPolling }: Props) => {
  const columns: ColumnsType<Device> = [
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
      render: (_, record) => {
        let displayIp = record.ip_address
        let displayPort = 502
        
        if (record.ip_address && record.ip_address.includes(':')) {
          const parts = record.ip_address.split(':')
          displayIp = parts[0]
          displayPort = parseInt(parts[1]) || 502
        }
        
        return (
          <Space direction="vertical" size={0}>
            <Tag icon={<GlobalOutlined />} color="blue">
              {displayIp}
            </Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Port: {displayPort} | Unit ID: {record.unit_id}
            </Text>
          </Space>
        )
      }
    },
    // [NEW] Column แสดง Polling Interval
    {
      title: 'Polling',
      key: 'polling',
      width: 150,
      render: (_, record) => {
        const isCustom = record.polling_interval != null
        const interval = isCustom ? record.polling_interval : defaultPollingInterval
        
        return (
          <Space>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Text style={{ 
                    color: isCustom ? '#1890ff' : '#8c8c8c', 
                    fontWeight: isCustom ? 600 : 400 
                }}>
                    <ThunderboltOutlined /> {interval} ms
                </Text>
                <Text type="secondary" style={{ fontSize: 10 }}>
                    {isCustom ? 'Custom Setting' : 'System Default'}
                </Text>
            </div>
            <Tooltip title="Edit Polling Interval">
                <Button 
                    size="small" 
                    type="text" 
                    icon={<SettingOutlined />} 
                    onClick={(e) => { e.stopPropagation(); onEditPolling(record); }} 
                />
            </Tooltip>
          </Space>
        )
      }
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