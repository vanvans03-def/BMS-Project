import { Table, Button, Badge, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo } from 'react'
import AOS from 'aos'

const { Text } = Typography

interface Device {
  id: number
  device_name: string
  device_instance_id: number
  ip_address: string
  network_number?: number
  is_active?: boolean
}

interface DeviceTableProps {
  devices: Device[]
  loading: boolean
  onViewDevice: (device: Device) => void
  searchText: string
}

export const DeviceTable = ({ devices, loading, onViewDevice, searchText }: DeviceTableProps) => {
  useEffect(() => {
    AOS.refresh()
  }, [devices])

  // Logic การกรองข้อมูล (Search Filter) - ค้นหาทุกคอลัมน์
  const filteredDevices = useMemo(() => {
    if (!searchText || searchText.trim() === '') {
      return devices // ถ้าไม่มีข้อความค้นหา ให้แสดงทั้งหมด
    }

    const lowerSearch = searchText.toLowerCase().trim()

    return devices.filter(device => {
      // ค้นหาใน: Status (Online), Device Name, Instance ID, IP Address, Network Number
      
      // 1. Status - ค้นหาคำว่า "online"
      const statusMatch = 'online'.includes(lowerSearch)
      
      // 2. Device Name
      const nameMatch = device.device_name?.toLowerCase().includes(lowerSearch)
      
      // 3. Instance ID (แปลงเป็น string ก่อนเช็ค)
      const instanceMatch = device.device_instance_id?.toString().includes(lowerSearch)
      
      // 4. IP Address
      const ipMatch = device.ip_address?.toLowerCase().includes(lowerSearch)
      
      // 5. Network Number (ถ้ามี)
      const networkMatch = device.network_number?.toString().includes(lowerSearch)

      // ถ้าตรงกับคอลัมน์ใดคอลัมน์หนึ่ง ให้แสดงผล
      return statusMatch || nameMatch || instanceMatch || ipMatch || networkMatch
    })
  }, [devices, searchText])

  const columns: ColumnsType<Device> = [
    {
      title: 'Status',
      key: 'status',
      width: 100,
      align: 'center',
      responsive: ['md'],
      render: () => <Badge status="success" text="Online" style={{ color: '#52c41a' }} />
    },
    {
      title: 'Device Name',
      dataIndex: 'device_name',
      key: 'device_name',
      render: (text, record) => (
        <div>
          <Text strong style={{ fontSize: 15 }}>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            ID: {record.device_instance_id}
          </Text>
        </div>
      )
    },
    {
      title: 'IP Address',
      dataIndex: 'ip_address',
      key: 'ip_address',
      responsive: ['lg']
    },
    {
      title: 'Network',
      dataIndex: 'network_number',
      key: 'network',
      responsive: ['xl'],
      render: (val) => val || '-'
    },
    {
      title: 'Action',
      key: 'action',
      align: 'center',
      width: 120,
      render: (_, record) => (
        <Button type="primary" size="small" onClick={() => onViewDevice(record)}>
          View Points
        </Button>
      )
    }
  ]

  return (
    <Table
      columns={columns}
      dataSource={filteredDevices} // ใช้ข้อมูลที่กรองแล้ว
      loading={loading}
      rowKey="id"
      pagination={{ pageSize: 10, showSizeChanger: true }}
      scroll={{ x: 800 }}
    />
  )
}