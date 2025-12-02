/* eslint-disable react-hooks/set-state-in-effect */
import { Table, Button, Badge, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import AOS from 'aos'

// [UPDATED] Import Type กลางมาใช้แทนการประกาศเอง
import type { Device } from '../../types/common'

const { Text } = Typography

// [REMOVED] ลบ interface Device เดิมออก
// interface Device { ... } 

interface DeviceTableProps {
  devices: Device[]
  loading: boolean
  onViewDevice: (device: Device) => void
  searchText: string
}

export const DeviceTable = ({ devices, loading, onViewDevice, searchText }: DeviceTableProps) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    AOS.refresh()
  }, [devices])

  const filteredDevices = useMemo(() => {
    if (!searchText || searchText.trim() === '') {
      return devices
    }

    const lowerSearch = searchText.toLowerCase().trim()

    return devices.filter(device => {
      const statusMatch = 'online'.includes(lowerSearch)
      const nameMatch = device.device_name?.toLowerCase().includes(lowerSearch)
      // [UPDATED] ใส่ ?. และ ?? false เพื่อรองรับ undefined
      const instanceMatch = device.device_instance_id?.toString().includes(lowerSearch) ?? false
      const ipMatch = device.ip_address?.toLowerCase().includes(lowerSearch)
      const networkMatch = device.network_number?.toString().includes(lowerSearch) ?? false

      return statusMatch || nameMatch || instanceMatch || ipMatch || networkMatch
    })
  }, [devices, searchText])

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
            {/* [UPDATED] ใส่ ?? '-' กันไว้กรณีไม่มี ID */}
            ID: {record.device_instance_id ?? '-'}
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
            setCurrentPage(1) 
          }
        }
      }}
      scroll={{ x: 800 }}
    />
  )
}