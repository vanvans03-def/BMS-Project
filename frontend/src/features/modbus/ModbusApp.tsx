/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react'
import { Button, Typography, Space, Card, Modal, Form, Input, InputNumber, Select, message, Row, Col, Statistic, Tabs } from 'antd'
import {
  ReloadOutlined, PlusOutlined, DatabaseOutlined,
  HddOutlined, ThunderboltOutlined, ArrowLeftOutlined,
  GlobalOutlined, ApiOutlined, UserOutlined, SaveOutlined
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import AOS from 'aos'

import { authFetch } from '../../utils/authFetch'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { ModbusDeviceTable } from './ModbusDeviceTable'
import { ModbusPointTable } from './ModbusPointTable'
import { WriteValueModal } from '../../components/WriteValueModal'
import { GeneralSettings, UserSettings, DatabaseSettings } from '../../components/SettingsTabs'
import { LogsPage } from '../../components/LogsPage'
import { ProfileModal } from '../../components/ProfileModal'

import type { Device, Point, PointValue } from '../../types/common'

const { Title, Text } = Typography

// Modbus Network Settings Component (Code เดิม)
const ModbusNetworkSettings = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    authFetch('/settings').then(res => res.json()).then(data => form.setFieldsValue(data))
  }, [form])

  const onFinish = async (v: any) => {
    setLoading(true)
    try {
      await authFetch('/settings', { method: 'PUT', body: JSON.stringify(v) })
      message.success('Saved configuration')
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
    } catch {
      message.error('Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <div data-aos="fade-up">
        <Title level={5}><ApiOutlined /> Modbus Configuration</Title>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Row gutter={16}>
            <Col xs={12}>
              <Form.Item name="polling_interval" label="Polling Interval (ms)" help="Default system-wide polling rate">
                <InputNumber style={{ width: '100%' }} min={500} step={500} />
              </Form.Item>
            </Col>
            <Col xs={12}>
              <Form.Item name="modbus_timeout" label="Timeout (ms)">
                <InputNumber style={{ width: '100%' }} min={1000} step={1000} />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>Save Configuration</Button>
        </Form>
      </div>
    </Card>
  )
}

interface ModbusAppProps { onBack: () => void; initialDeviceId?: number | null }

export default function ModbusApp({ onBack, initialDeviceId }: ModbusAppProps) {
  const [currentView, setCurrentView] = useState<string>(initialDeviceId ? "loading" : "dashboard")
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [messageApi, contextHolder] = message.useMessage()

  // Modals & Forms
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false)
  const [isPointModalOpen, setIsPointModalOpen] = useState(false)
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  // [NEW] Edit Polling State
  const [isEditPollingOpen, setIsEditPollingOpen] = useState(false)
  const [deviceToEdit, setDeviceToEdit] = useState<Device | null>(null)
  const [formEditPolling] = Form.useForm()

  const [writingPoint, setWritingPoint] = useState<Point | null>(null)
  const [writeValue, setWriteValue] = useState<string | number>("")
  const [isWriting, setIsWriting] = useState(false)
  const [pointValues, setPointValues] = useState<Map<number, PointValue>>(new Map())
  const [formDevice] = Form.useForm()
  const [formPoint] = Form.useForm()

  useEffect(() => { AOS.refresh() }, [currentView, selectedDevice])

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await authFetch('/settings')).json(),
    staleTime: 0
  })
  const globalPollingInterval = Math.max(Number(settings?.polling_interval) || 3000, 500)

  const { data: devices, isLoading: loadingDevices, refetch: refetchDevices } = useQuery<Device[]>({
    queryKey: ['modbus-devices'],
    queryFn: async () => {
      const res = await authFetch('/devices')
      const all = await res.json()
      return Array.isArray(all) ? all.filter((d: any) => d.protocol === 'MODBUS') : []
    },
    refetchInterval: 10000
  })

  // [NEW] Auto-select device from navigation
  useEffect(() => {
    if (initialDeviceId && devices) {
      if (!selectedDevice) {
        const target = devices.find(d => d.id === initialDeviceId)
        if (target) {
          setSelectedDevice(target)
          setCurrentView('detail')
        } else if (!loadingDevices) {
          messageApi.error("Device not found")
          setCurrentView('dashboard')
        }
      }
    }
  }, [devices, initialDeviceId, loadingDevices])

  const { data: points, isLoading: loadingPoints, refetch: refetchPoints } = useQuery<Point[]>({
    queryKey: ['modbus-points', selectedDevice?.id],
    enabled: !!selectedDevice && currentView === 'detail',
    queryFn: async () => (await authFetch(`/points/${selectedDevice!.id}`)).json()
  })

  // Polling Logic
  useEffect(() => {
    if (currentView !== 'detail' || !selectedDevice) return

    const effectiveInterval = selectedDevice.polling_interval
      ? Math.max(selectedDevice.polling_interval, 500)
      : globalPollingInterval

    console.log(`⏱️ Polling: ${effectiveInterval}ms`)

    const fetchVal = async () => {
      try {
        const res = await authFetch('/monitor/read-device-points', {
          method: 'POST', body: JSON.stringify({ deviceId: selectedDevice.id })
        })
        const data = await res.json()
        if (data.success && data.values) {
          const map = new Map()
          data.values.forEach((v: PointValue) => map.set(v.pointId, v))
          setPointValues(map)
        }
      } catch (err) { console.error('Polling error:', err) }
    }
    fetchVal()
    const interval = setInterval(fetchVal, effectiveInterval)
    return () => clearInterval(interval)
  }, [currentView, selectedDevice, globalPollingInterval])

  const getScaledValue = (point: Point | null, rawValue: any) => {
    if (!point || typeof rawValue !== 'number') return rawValue
    if (point.data_format === 'TEMP_C_100') return rawValue / 100
    if (point.data_format === 'TEMP_C_10') return rawValue / 10
    return rawValue
  }

  // Handlers
  const handleAddDevice = async (values: any) => {
    try {
      const port = values.port || 502
      const ipAddress = `${values.ip}:${port}`
      await authFetch('/devices', {
        method: 'POST',
        body: JSON.stringify([{
          device_name: values.name,
          device_instance_id: Math.floor(Math.random() * 100000),
          ip_address: ipAddress,
          network_number: 0,
          protocol: 'MODBUS',
          unit_id: values.unitId,
          polling_interval: values.pollingInterval
        }])
      })
      messageApi.success('Device added')
      setIsDeviceModalOpen(false)
      formDevice.resetFields()
      refetchDevices()
    } catch { messageApi.error('Failed to add') }
  }

  const handleDeleteDevice = async (id: number) => {
    try { await authFetch(`/devices/${id}`, { method: 'DELETE' }); messageApi.success('Deleted'); refetchDevices(); }
    catch { messageApi.error('Failed') }
  }

  // [NEW] Handler Update Polling
  const handleUpdatePolling = async (values: any) => {
    if (!deviceToEdit) return
    try {
      await authFetch(`/devices/${deviceToEdit.id}`, {
        method: 'PUT',
        body: JSON.stringify({ polling_interval: values.pollingInterval || null })
      })
      messageApi.success('Polling interval updated')
      setIsEditPollingOpen(false)
      setDeviceToEdit(null)
      refetchDevices()

      // ถ้าเป็น Device ที่กำลังดูอยู่ ให้ update state เพื่อให้ polling เปลี่ยนทันที
      if (selectedDevice?.id === deviceToEdit.id) {
        setSelectedDevice(prev => prev ? { ...prev, polling_interval: values.pollingInterval || null } : null)
      }
    } catch { messageApi.error('Update failed') }
  }

  // Other handlers
  const handleAddPoint = async (values: any) => {
    if (!selectedDevice) return
    try {
      const res = await authFetch('/modbus/add-point', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: selectedDevice.id,
          pointName: values.name,
          registerType: values.registerType,
          address: values.address,
          dataType: values.dataType,
          dataFormat: values.dataFormat
        })
      })
      const data = await res.json()

      if (data.success) {
        messageApi.success('Point added successfully')
        setIsPointModalOpen(false)
        formPoint.resetFields()
        refetchPoints()
      } else {
        messageApi.error(data.message || 'Failed to add point')
      }
    } catch (error) {
      console.error(error)
      messageApi.error('Error adding point')
    }
  }

  const handleDeletePoint = async (id: number) => {
    try {
      await authFetch(`/modbus/point/${id}`, { method: 'DELETE' })
      messageApi.success('Point deleted')
      refetchPoints()
    } catch {
      messageApi.error('Failed to delete point')
    }
  }

  const handleWrite = async () => {
    if (!writingPoint) return

    setIsWriting(true)
    try {
      const isCoil = writingPoint.register_type === 'COIL'
      const endpoint = isCoil ? '/modbus/write-coil' : '/modbus/write-register'

      // Prepare value
      let payloadValue: any = writeValue
      if (isCoil) {
        // Convert 'active'/1/true -> true, etc.
        payloadValue = (writeValue === 'active' || writeValue === 1 || writeValue === 'true')
      } else {
        payloadValue = Number(writeValue)
      }

      const res = await authFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          pointId: writingPoint.id,
          value: payloadValue
        })
      })

      const data = await res.json()

      if (data.success) {
        messageApi.success('Write command sent')
        setIsWriteModalOpen(false)
        // Refresh values after a short delay
        setTimeout(refetchPoints, 500)
      } else {
        messageApi.error(data.message || 'Write failed')
      }
    } catch (error) {
      console.error(error)
      messageApi.error('Error writing value')
    } finally {
      setIsWriting(false)
    }
  }

  const renderDashboard = () => (
    <>
      <div style={{ marginBottom: 24 }} data-aos="fade-down">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Title level={3} style={{ margin: 0 }}>Modbus Manager</Title>
            <Text type="secondary">Manage Modbus TCP/IP devices and registers</Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetchDevices()}>Refresh</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsDeviceModalOpen(true)}>Add Device</Button>
            </Space>
          </Col>
        </Row>
      </div>

      <div data-aos="fade-up">
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} md={8}><Card><Statistic title="Total Devices" value={devices?.length || 0} prefix={<DatabaseOutlined />} /></Card></Col>
          <Col xs={12} md={8}><Card><Statistic title="Online" value={devices?.filter(d => d.is_active).length || 0} valueStyle={{ color: '#3f8600' }} prefix={<ThunderboltOutlined />} /></Card></Col>
          <Col xs={12} md={8}><Card><Statistic title="Total Points" value={0} prefix={<HddOutlined />} /></Card></Col>
        </Row>
      </div>

      <div data-aos="fade-up" data-aos-delay="200">
        <Card title="Device List">
          <ModbusDeviceTable
            devices={devices || []}
            loading={loadingDevices}
            defaultPollingInterval={globalPollingInterval} // [NEW] Pass default
            onView={(d) => { setSelectedDevice(d); setCurrentView('detail') }}
            onDelete={handleDeleteDevice}
            onEditPolling={(d) => { setDeviceToEdit(d); formEditPolling.setFieldsValue({ pollingInterval: d.polling_interval }); setIsEditPollingOpen(true); }} // [NEW] Open Edit Modal
          />
        </Card>
      </div>
    </>
  )

  const renderDetail = () => (
    <>
      {/* ... Detail Header ... */}
      <div data-aos="fade-down">
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Button icon={<ArrowLeftOutlined />} type="link" onClick={() => { setSelectedDevice(null); setCurrentView('dashboard') }}>Back</Button>
              <Title level={4} style={{ margin: 0 }}>{selectedDevice?.device_name}</Title>
              <Text type="secondary"><GlobalOutlined /> {selectedDevice?.ip_address} | Unit ID: {selectedDevice?.unit_id}</Text>
            </Col>
            <Col>
              <Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsPointModalOpen(true)}>Add Point</Button>
                <Button icon={<ReloadOutlined />} onClick={() => refetchPoints()}>Refresh</Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </div>
      <div data-aos="fade-up" data-aos-delay="200">
        <Card>
          <ModbusPointTable
            points={points || []} pointValues={pointValues} loading={loadingPoints}
            onWrite={(p) => { setWritingPoint(p); setWriteValue(""); setIsWriteModalOpen(true) }}
            onDelete={handleDeletePoint}
          />
        </Card>
      </div>
    </>
  )

  if (currentView === 'loading') {
    return (
      <DashboardLayout title="Modbus System" headerIcon={<HddOutlined />} themeColor="#faad14" onBack={onBack} currentView="loading" onMenuClick={() => { }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Card style={{ width: 300, textAlign: 'center' }}>
            <Space direction="vertical">
              <Text>Loading Device...</Text>
              <ThunderboltOutlined spin style={{ fontSize: 24, color: '#faad14' }} />
            </Space>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Modbus System" headerIcon={<HddOutlined />} themeColor="#faad14" onBack={onBack} currentView={currentView === 'detail' ? 'dashboard' : currentView} onMenuClick={(k) => { setCurrentView(k); if (k === 'dashboard') setSelectedDevice(null) }} onProfileClick={() => setIsProfileModalOpen(true)}>
      {contextHolder}
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'detail' && renderDetail()}
      {currentView === 'settings' && (
        <Card>
          <Tabs items={[
            { key: 'general', label: <span><GlobalOutlined /> General</span>, children: <GeneralSettings /> },
            { key: 'network', label: <span><ApiOutlined /> Modbus Config</span>, children: <ModbusNetworkSettings /> },
            { key: 'users', label: <span><UserOutlined /> Users</span>, children: <UserSettings /> },
            { key: 'database', label: <span><DatabaseOutlined /> Database</span>, children: <DatabaseSettings filterProtocol="MODBUS" /> },
          ]} />
        </Card>
      )}
      {currentView === 'logs' && <LogsPage defaultProtocol="MODBUS" />}

      {/* Add Device Modal */}
      <Modal title="Add Modbus Device" open={isDeviceModalOpen} onCancel={() => setIsDeviceModalOpen(false)} footer={null}>
        <Form form={formDevice} layout="vertical" onFinish={handleAddDevice}>
          <Form.Item name="name" label="Device Name" rules={[{ required: true }]}><Input placeholder="e.g. PLC-01" /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="ip" label="IP Address" rules={[{ required: true }]}><Input placeholder="192.168.1.100" /></Form.Item></Col>
            <Col span={6}><Form.Item name="port" label="Port" initialValue={502}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="unitId" label="Unit ID" initialValue={1}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="pollingInterval" label="Polling Interval (ms)" tooltip="Leave blank to use system default">
            <InputNumber style={{ width: '100%' }} placeholder={`Default: ${globalPollingInterval}ms`} min={500} step={500} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Add Device</Button>
        </Form>
      </Modal>

      {/* [NEW] Edit Polling Modal */}
      <Modal
        title="Edit Polling Interval"
        open={isEditPollingOpen}
        onCancel={() => setIsEditPollingOpen(false)}
        footer={null}
        width={400}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">Target Device: </Text>
          <Text strong>{deviceToEdit?.device_name}</Text>
        </div>
        <Form form={formEditPolling} layout="vertical" onFinish={handleUpdatePolling}>
          <Form.Item
            name="pollingInterval"
            label="Polling Interval (ms)"
            help={`Current System Default: ${globalPollingInterval} ms`}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Leave blank to use Default"
              min={500} step={500}
            />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setIsEditPollingOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Update</Button>
          </div>
        </Form>
      </Modal>

      {/* Other Modals... (Add Point, Write, Profile) */}
      <Modal title="Add Modbus Point" open={isPointModalOpen} onCancel={() => setIsPointModalOpen(false)} footer={null}>
        {/* ... Form Content ... */}
        <Form form={formPoint} layout="vertical" onFinish={handleAddPoint}>
          <Form.Item name="name" label="Point Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="registerType" label="Register Type" initialValue="HOLDING_REGISTER"><Select><Select.Option value="COIL">Coil</Select.Option><Select.Option value="HOLDING_REGISTER">Holding Register</Select.Option></Select></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="address" label="Address" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="dataType" label="Data Type" initialValue="INT16"><Select><Select.Option value="INT16">INT16</Select.Option><Select.Option value="UINT16">UINT16</Select.Option><Select.Option value="BOOL">Boolean</Select.Option></Select></Form.Item></Col>
          </Row>
          <Form.Item name="dataFormat" label="Format" initialValue="RAW"><Select><Select.Option value="RAW">Raw</Select.Option><Select.Option value="TEMP_C_100">Temp /100</Select.Option><Select.Option value="TEMP_C_10">Temp /10</Select.Option></Select></Form.Item>
          <Button type="primary" htmlType="submit" block>Add Point</Button>
        </Form>
      </Modal>

      <WriteValueModal open={isWriteModalOpen} point={writingPoint} currentValue={getScaledValue(writingPoint, pointValues.get(writingPoint?.id || 0)?.value)} writeValue={writeValue} priority={0} loading={isWriting} onClose={() => setIsWriteModalOpen(false)} onWrite={handleWrite} onValueChange={setWriteValue} onPriorityChange={() => { }} />
      <ProfileModal open={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </DashboardLayout>
  )
}