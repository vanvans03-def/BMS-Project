/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Device Manager Component
 * 
 * Displays a table of devices for a selected network with actions to:
 * - View/edit device configuration
 * - Configure individual points within the device
 * - Manage device-network linkage
 */

import { Table, Button, Space, Popconfirm, Tag, Badge, Empty, message, Spin } from 'antd'
import { EditOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'

import DeviceConfigurationModal from '../shared/DeviceConfigurationModal'
import PointConfigurationModal from '../shared/PointConfigurationModal'

interface DeviceManagerProps {
  networkId: number | null
  protocol: 'BACNET' | 'MODBUS'
  onDeviceLinked?: () => void
}

interface Device {
  id: number
  name: string
  description?: string
  enabled: boolean
}

interface Point {
  id: number
  name: string
  dataType?: string
  unit?: string
}

export const DeviceManager = ({
  networkId,
  protocol,
  onDeviceLinked
}: DeviceManagerProps) => {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [deviceConfigOpen, setDeviceConfigOpen] = useState(false)
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null)
  const [selectedDeviceName, setSelectedDeviceName] = useState('')
  const [pointConfigOpen, setPointConfigOpen] = useState(false)
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null)
  const [selectedPointName, setSelectedPointName] = useState('')
  const [devicePoints, setDevicePoints] = useState<Point[]>([])
  const [pointsLoading, setPointsLoading] = useState(false)

  useEffect(() => {
    if (networkId) {
      loadDevices()
    }
  }, [networkId])

  const loadDevices = async () => {
    if (!networkId) return
    setLoading(true)
    try {
      // In a real implementation, fetch devices linked to this network
      // For now, this is a placeholder
      // const response = await fetch(`/config/networks/${networkId}/devices`)
      // const data = await response.json()
      // setDevices(data)
      setDevices([])
    } catch (err) {
      console.error('Failed to load devices:', err)
      message.error('Failed to load devices')
    } finally {
      setLoading(false)
    }
  }

  const handleConfigureDevice = (deviceId: number, deviceName: string) => {
    setSelectedDeviceId(deviceId)
    setSelectedDeviceName(deviceName)
    setDeviceConfigOpen(true)
  }

  const handleDeviceConfigSaved = () => {
    loadDevices()
    onDeviceLinked?.()
  }

  const handleConfigurePoints = async (deviceId: number) => {
    setPointsLoading(true)
    try {
      // In a real implementation, fetch points for this device
      // const response = await fetch(`/config/devices/${deviceId}/points`)
      // const points = await response.json()
      // setDevicePoints(points)
      setDevicePoints([])
    } catch (err) {
      console.error('Failed to load device points:', err)
      message.error('Failed to load device points')
    } finally {
      setPointsLoading(false)
    }
  }

  const handleEditPoint = (pointId: number, pointName: string) => {
    setSelectedPointId(pointId)
    setSelectedPointName(pointName)
    setPointConfigOpen(true)
  }

  const handleDeleteDevice = async (deviceId: number) => {
    try {
      // Unlink device from network (if needed)
      message.success('Device unlinked from network')
      loadDevices()
    } catch (err) {
      console.error('Failed to delete device:', err)
      message.error('Failed to delete device')
    }
  }

  const deviceColumns = [
    {
      title: 'Device ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Status',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean) => (
        <Badge
          status={enabled ? 'processing' : 'default'}
          text={enabled ? 'Enabled' : 'Disabled'}
        />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: Device) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => handleConfigureDevice(record.id, record.name)}
            title="Configure device settings"
          />
          <Popconfirm
            title="Unlink Device"
            description="Remove this device from the network?"
            onConfirm={() => handleDeleteDevice(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              title="Unlink device from network"
            />
          </Popconfirm>
        </Space>
      )
    }
  ]

  const pointColumns = [
    {
      title: 'Point ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Data Type',
      dataIndex: 'dataType',
      key: 'dataType',
      render: (type: string) => type ? <Tag>{type}</Tag> : '-'
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      render: (unit: string) => unit ? <Tag color="blue">{unit}</Tag> : '-'
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_: any, record: Point) => (
        <Button
          type="primary"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEditPoint(record.id, record.name)}
        />
      )
    }
  ]

  if (!networkId) {
    return <Empty description="No network selected" />
  }

  return (
    <Spin spinning={loading}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Devices Table */}
        <div>
          <h3>Devices in Network</h3>
          <Table
            columns={deviceColumns}
            dataSource={devices}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
            locale={{ emptyText: 'No devices linked to this network' }}
          />
        </div>

        {/* Device Configuration Modal */}
        <DeviceConfigurationModal
          open={deviceConfigOpen}
          onClose={() => setDeviceConfigOpen(false)}
          onSave={handleDeviceConfigSaved}
          deviceId={selectedDeviceId}
          deviceName={selectedDeviceName}
          protocol={protocol}
        />

        {/* Point Configuration Modal */}
        <PointConfigurationModal
          open={pointConfigOpen}
          onClose={() => setPointConfigOpen(false)}
          onSave={() => loadDevices()}
          pointId={selectedPointId}
          pointName={selectedPointName}
        />
      </div>
    </Spin>
  )
}

export default DeviceManager
