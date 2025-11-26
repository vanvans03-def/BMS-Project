/* eslint-disable react-hooks/set-state-in-effect */
import { Table, Button, Badge, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react' // [UPDATED] เพิ่ม useState
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
  // [UPDATED] เพิ่ม State สำหรับ Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    AOS.refresh()
  }, [devices])

  // Logic การกรองข้อมูล (Search Filter)
  const filteredDevices = useMemo(() => {
    if (!searchText || searchText.trim() === '') {
      return devices
    }

    const lowerSearch = searchText.toLowerCase().trim()

    return devices.filter(device => {
      const statusMatch = 'online'.includes(lowerSearch)
      const nameMatch = device.device_name?.toLowerCase().includes(lowerSearch)
      const instanceMatch = device.device_instance_id?.toString().includes(lowerSearch)
      const ipMatch = device.ip_address?.toLowerCase().includes(lowerSearch)
      const networkMatch = device.network_number?.toString().includes(lowerSearch)

      return statusMatch || nameMatch || instanceMatch || ipMatch || networkMatch
    })
  }, [devices, searchText])

  // [UPDATED] รีเซ็ตหน้าเมื่อมีการค้นหา
  useEffect(() => {
    setCurrentPage(1)
  }, [searchText])

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
      dataSource={filteredDevices}
      loading={loading}
      rowKey="id"
      // [UPDATED] ใช้ Pagination รูปแบบเดียวกับ LogsPage
      pagination={{ 
        current: currentPage,
        pageSize: pageSize,
        total: filteredDevices.length,
        showSizeChanger: true,
        showQuickJumper: true,
        pageSizeOptions: ['10', '20', '50', '100'],
        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} devices`,
        onChange: (page, newPageSize) => {
          setCurrentPage(page)
          if (newPageSize !== pageSize) {
            setPageSize(newPageSize)
            setCurrentPage(1) // รีเซ็ตกลับหน้าแรกเมื่อเปลี่ยนขนาดหน้า
          }
        }
      }}
      scroll={{ x: 800 }}
    />
  )
}