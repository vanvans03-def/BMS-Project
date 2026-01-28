/* eslint-disable react-hooks/set-state-in-effect */
import { Table, Button, Badge, Typography, Space, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import AOS from 'aos'
import { SettingOutlined, GlobalOutlined, EyeOutlined, ThunderboltOutlined } from '@ant-design/icons'
import type { Device } from '../../types/common'

const { Text } = Typography

interface DeviceTableProps {
  devices: Device[]
  loading: boolean
  defaultPollingInterval: number // [NEW]
  onViewDevice: (device: Device) => void
  onEditDevice: (device: Device) => void // [NEW] (Renamed from onEditPolling)
  onConfigDevice: (device: Device) => void // [NEW] Open Universal Config
  searchText: string
}

export const DeviceTable = ({ devices, loading, defaultPollingInterval, onViewDevice, onEditDevice, onConfigDevice, searchText }: DeviceTableProps) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    AOS.refresh()
  }, [devices])

  const filteredDevices = useMemo(() => {
    if (!searchText || searchText.trim() === '') return devices
    const lowerSearch = searchText.toLowerCase().trim()
    return devices.filter(device => {
      const statusMatch = 'online'.includes(lowerSearch)
      const nameMatch = device.device_name?.toLowerCase().includes(lowerSearch)
      const instanceMatch = device.device_instance_id?.toString().includes(lowerSearch) ?? false
      const ipMatch = device.ip_address?.toLowerCase().includes(lowerSearch)
      return statusMatch || nameMatch || instanceMatch || ipMatch
    })
  }, [devices, searchText])

  useEffect(() => { setCurrentPage(1) }, [searchText])

  const columns: ColumnsType<Device> = [
    {
      title: 'Status',
      key: 'status',
      width: 100,
      align: 'center',
      render: () => <Badge status="success" text="Online" />
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
        return (
          <Space direction="vertical" size={0}>
            <Tag icon={<GlobalOutlined />} color="blue">
              {record.ip_address}
            </Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Device ID: {record.device_instance_id}
            </Text>
          </Space>
        )
      }
    },
    // [NEW] Polling Column
    {
      title: 'Polling',
      key: 'polling',
      width: 160,
      render: (_, record) => {
        const isCustom = record.polling_interval != null
        const interval = isCustom ? record.polling_interval : defaultPollingInterval

        return (
          <Space>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text style={{ color: isCustom ? '#1890ff' : '#8c8c8c', fontWeight: isCustom ? 600 : 400 }}>
                <ThunderboltOutlined /> {interval} ms
              </Text>
              <Text type="secondary" style={{ fontSize: 10 }}>
                {isCustom ? 'Custom Setting' : 'System Default'}
              </Text>
            </div>
            <Button size="small" type="text" icon={<SettingOutlined />} onClick={(e) => { e.stopPropagation(); onEditDevice(record); }} />
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
          <Button type="default" icon={<SettingOutlined />} onClick={(e) => { e.stopPropagation(); onConfigDevice(record); }} />
          <Button type="primary" ghost icon={<EyeOutlined />} onClick={() => onViewDevice(record)}>
            Points
          </Button>
        </Space>
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
        onChange: (page, newPageSize) => {
          setCurrentPage(page)
          if (newPageSize !== pageSize) { setPageSize(newPageSize); setCurrentPage(1); }
        }
      }}
      scroll={{ x: 800 }}
    />
  )
}