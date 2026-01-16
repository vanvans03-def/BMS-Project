/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useMemo } from 'react'
import { Button, Typography, Space, Card, Modal, Form, Input, InputNumber, Select, message, Row, Col, Tabs, Tag, Radio } from 'antd'
import {
  ReloadOutlined, PlusOutlined, DatabaseOutlined,
  HddOutlined, ThunderboltOutlined, ArrowLeftOutlined,
  GlobalOutlined, ApiOutlined, SaveOutlined, FileTextOutlined,
  LineChartOutlined
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import AOS from 'aos'

import { authFetch } from '../../utils/authFetch'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { ModbusDeviceTable } from './ModbusDeviceTable'
import { ModbusGatewayTable } from './ModbusGatewayTable'
import { ModbusPointTable } from './ModbusPointTable'
import { WriteValueModal } from '../../components/WriteValueModal'
import { GeneralSettings, DatabaseSettings } from '../../components/SettingsTabs'
import { LogsPage } from '../../components/LogsPage'
import { ProfileModal } from '../../components/ProfileModal'
import HistoryGraphPanel from '../central_logs/HistoryGraphPanel'
import HistoryLogsPanel from '../central_logs/HistoryLogsPanel'

import type { Device, Point, PointValue } from '../../types/common'

const { Title, Text } = Typography

// Modbus Network Settings Component
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

interface ModbusAppProps { onBack: () => void; initialDeviceId?: number | null; initialView?: string }

export default function ModbusApp({ onBack, initialDeviceId, initialView }: ModbusAppProps) {
  const [currentView, setCurrentView] = useState<string>(initialDeviceId ? "loading" : (initialView || "dashboard"))
  const [selectedGateway, setSelectedGateway] = useState<Device | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [messageApi, contextHolder] = message.useMessage()

  // Modals & Forms
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false)
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false)
  const [isPointModalOpen, setIsPointModalOpen] = useState(false)
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [historyPoint, setHistoryPoint] = useState<Point | null>(null)

  // Edit Polling State
  const [isEditPollingOpen, setIsEditPollingOpen] = useState(false)
  const [deviceToEdit, setDeviceToEdit] = useState<Device | null>(null)
  const [formEditPolling] = Form.useForm()

  const [writingPoint, setWritingPoint] = useState<Point | null>(null)
  const [writeValue, setWriteValue] = useState<string | number>("")
  const [isWriting, setIsWriting] = useState(false)
  const [pointValues, setPointValues] = useState<Map<number, PointValue>>(new Map())
  const [formGateway] = Form.useForm()
  const [formDevice] = Form.useForm()
  const [formPoint] = Form.useForm()

  useEffect(() => { AOS.refresh() }, [currentView, selectedGateway, selectedDevice])

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

  // Auto-select device from navigation
  useEffect(() => {
    if (initialDeviceId && devices) {
      if (!selectedDevice) {
        const target = devices.find(d => d.id === initialDeviceId)
        if (target) {
          // If it's a child device, we need to find its gateway too?
          // Backend should ideally resolve `parent_id`
          // For now, if we find specific device, just open 'detail'
          setSelectedDevice(target)
          setCurrentView('detail')

          if (target.parent_id) {
            const parent = devices.find(d => d.id === target.parent_id)
            if (parent) setSelectedGateway(parent)
          }

        } else if (!loadingDevices) {
          messageApi.error("Device not found")
          setCurrentView('dashboard')
        }
      }
    }
  }, [devices, initialDeviceId, loadingDevices])

  const { data: points, isLoading: loadingPoints, refetch: refetchPoints } = useQuery<Point[]>({
    queryKey: ['modbus-points', selectedDevice?.id],
    enabled: !!selectedDevice && (currentView === 'detail' || currentView === 'points'),
    queryFn: async () => (await authFetch(`/points/${selectedDevice!.id}`)).json()
  })

  // Polling Logic
  useEffect(() => {
    if ((currentView !== 'detail' && currentView !== 'points') || !selectedDevice) return

    const effectiveInterval = selectedDevice.polling_interval
      ? Math.max(selectedDevice.polling_interval, 500)
      : globalPollingInterval

    // console.log(`⏱️ Polling: ${effectiveInterval}ms`)

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
  const handleAddGateway = async (values: any) => {
    try {
      const connectionType = values.connectionType || 'TCP'

      const payload: any = {
        device_name: values.name,
        device_instance_id: Math.floor(Math.random() * 100000),
        network_number: 0,
        protocol: 'MODBUS',
        device_type: 'GATEWAY',
        polling_interval: values.pollingInterval,
        connection_type: connectionType
      }

      if (connectionType === 'TCP') {
        const port = values.port || 502
        payload.ip_address = `${values.ip}:${port}`
        payload.tcp_response_timeout = values.timeout
      } else {
        payload.serial_port_name = values.serialPort
        payload.serial_baud_rate = values.baudRate
        payload.serial_data_bits = values.dataBits
        payload.serial_stop_bits = values.stopBits
        payload.serial_parity = values.parity
      }

      // Check for duplicate Gateway/device (Simple check)
      if (connectionType === 'TCP') {
        const isDuplicate = devices?.some(d => d.ip_address === payload.ip_address)
        if (isDuplicate) {
          messageApi.error(`A device/gateway with IP ${payload.ip_address} already exists.`)
          return
        }
      }

      await authFetch('/devices', {
        method: 'POST',
        body: JSON.stringify([payload])
      })
      messageApi.success('Gateway added')
      setIsGatewayModalOpen(false)
      formGateway.resetFields()
      refetchDevices()
      // Ensure we stay on dashboard
      setCurrentView('dashboard')
      setSelectedGateway(null)
      setSelectedDevice(null)
    } catch { messageApi.error('Failed to add gateway') }
  }

  const handleAddDevice = async (values: any) => {
    if (!selectedGateway) return
    try {
      // Inherit IP from Gateway
      const ipAddress = selectedGateway.ip_address

      await authFetch('/devices', {
        method: 'POST',
        body: JSON.stringify([{
          device_name: values.name,
          device_instance_id: Math.floor(Math.random() * 100000),
          ip_address: ipAddress,
          network_number: 0,
          protocol: 'MODBUS',
          unit_id: values.unitId,
          polling_interval: values.pollingInterval,
          device_type: 'DEVICE',
          parent_id: selectedGateway.id,
          // Tuning
          tcp_response_timeout: values.timeout,
          byte_order_float: values.byteOrderFloat,
          byte_order_long: values.byteOrderLong
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

      if (selectedDevice?.id === deviceToEdit.id) {
        setSelectedDevice(prev => prev ? { ...prev, polling_interval: values.pollingInterval || null } : null)
      }
    } catch { messageApi.error('Update failed') }
  }

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

      let payloadValue: any = writeValue
      if (isCoil) {
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
            <Text type="secondary">Manage Gateways</Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetchDevices()}>Refresh</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsGatewayModalOpen(true)}>Add Gateway</Button>
            </Space>
          </Col>
        </Row>
      </div>

      <div data-aos="fade-up" data-aos-delay="200">
        <Card title="Modbus Networks">
          <ModbusGatewayTable
            gateways={devices?.filter(d => d.parent_id == null) || []}
            loading={loadingDevices}
            onView={(g) => { setSelectedGateway(g); setCurrentView('gateway') }}
            onDelete={handleDeleteDevice}
            onEdit={(g) => {
              // Reuse edit polling logic or make new edit modal
              setDeviceToEdit(g)
              formEditPolling.setFieldsValue({ pollingInterval: g.polling_interval })
              setIsEditPollingOpen(true)
            }}
          />
        </Card>
      </div>
    </>
  )

  const renderGateway = () => (
    <>
      <div style={{ marginBottom: 24 }} data-aos="fade-down">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space align="center">
              <Title level={3} style={{ margin: 0 }}>{selectedGateway?.device_name}</Title>
              <Tag color="geekblue">{selectedGateway?.ip_address}</Tag>
            </Space>
            <Text type="secondary" style={{ display: 'block' }}>Gateway Configuration</Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetchDevices()}>Refresh</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsDeviceModalOpen(true)}>Add Device</Button>
            </Space>
          </Col>
        </Row>
      </div>

      <div data-aos="fade-up" data-aos-delay="200">
        <Card title="Devices in Network">
          <ModbusDeviceTable
            devices={devices?.filter(d => d.parent_id === selectedGateway?.id && d.device_type === 'DEVICE') || []}
            loading={loadingDevices}
            defaultPollingInterval={globalPollingInterval}
            onView={(d) => { setSelectedDevice(d); setCurrentView('detail') }}
            onDelete={handleDeleteDevice}
            onEditPolling={(d) => {
              setDeviceToEdit(d);
              formEditPolling.setFieldsValue({ pollingInterval: d.polling_interval });
              setIsEditPollingOpen(true);
            }}
          />
        </Card>
      </div>
    </>
  )

  const renderDetail = () => (
    <>
      <div data-aos="fade-down">
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col flex="auto">
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
            onViewHistory={(p) => setHistoryPoint(p)}
          />
        </Card>
      </div>
    </>
  )

  // Dynamic Menu (Updated Structure)
  const menuItems = useMemo(() => {
    if (selectedDevice && currentView === 'detail') {
      return [
        { key: "gateway", icon: <ArrowLeftOutlined />, label: "Back to Gateway" },
      ]
    }
    if (selectedGateway && currentView === 'gateway') {
      return [
        { key: "dashboard", icon: <ArrowLeftOutlined />, label: "Back to Gateways" },
        // { type: "divider" },
        // { key: "points", icon: <ApiOutlined />, label: "Points" },
      ]
    }
    return [
      { key: "dashboard", icon: <DatabaseOutlined />, label: "Dashboard" },
      { key: "history-graph", icon: <LineChartOutlined />, label: "History Graph" },
      { key: "history-logs", icon: <FileTextOutlined />, label: "History Logs" },
      { key: "logs", icon: <DatabaseOutlined />, label: "Audit Logs" },
    ]
  }, [selectedDevice, selectedGateway, currentView])

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
    <DashboardLayout
      title="Modbus Protocol"
      headerIcon={<HddOutlined />}
      themeColor="#faad14"
      onBack={
        ['dashboard', 'history-graph', 'history-logs', 'logs'].includes(currentView) ? onBack : undefined
      }
      currentView={currentView === 'points' ? 'detail' : (currentView === 'gateway' ? 'gateway' : currentView)}

      onMenuClick={(k) => {
        setCurrentView(k);
        if (k === 'dashboard') { setSelectedGateway(null); setSelectedDevice(null); }
        if (k === 'gateway') { setSelectedDevice(null); }
      }}
      onProfileClick={() => setIsProfileModalOpen(true)}
      menuItems={menuItems as any}
      headerActions={null}
    >
      {contextHolder}

      {/* Level 1 Views */}
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'gateway' && renderGateway()}

      {currentView === 'history-graph' && (
        <Card title="Global History Graph" style={{ height: '100%' }}>
          <div style={{ height: 'calc(100vh - 250px)' }}>
            <HistoryGraphPanel initialSelection={[]} />
          </div>
        </Card>
      )}

      {currentView === 'history-logs' && (
        <div data-aos="fade-up">
          <Card title="History Logs (Value Trends)">
            <HistoryLogsPanel />
          </Card>
        </div>
      )}

      {currentView === 'logs' && <LogsPage defaultProtocol="MODBUS" />}

      {/* Level 2 Views */}
      {(currentView === 'detail' || currentView === 'points') && renderDetail()}

      {/* Settings */}
      {currentView === 'settings' && (
        <Card>
          <Tabs items={[
            { key: 'general', label: <span><GlobalOutlined /> General</span>, children: <GeneralSettings /> },
            { key: 'network', label: <span><ApiOutlined /> Modbus Config</span>, children: <ModbusNetworkSettings /> },
            { key: 'database', label: <span><DatabaseOutlined /> Database</span>, children: <DatabaseSettings filterProtocol="MODBUS" /> },
          ]} />
        </Card>
      )}

      {/* Add Gateway Modal */}
      <Modal title="Add Modbus Gateway" open={isGatewayModalOpen} onCancel={() => setIsGatewayModalOpen(false)} footer={null}>
        <Form form={formGateway} layout="vertical" onFinish={handleAddGateway} initialValues={{ connectionType: 'TCP', port: 502, timeout: 2000, baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' }}>
          <Form.Item name="name" label="Gateway Name" rules={[{ required: true }]}><Input placeholder="e.g. Building A Gateway" /></Form.Item>

          <Form.Item name="connectionType" label="Connection Type">
            <Radio.Group buttonStyle="solid">
              <Radio.Button value="TCP">TCP (Ethernet)</Radio.Button>
              <Radio.Button value="SERIAL">Serial (RS-485)</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, current) => prev.connectionType !== current.connectionType}>
            {({ getFieldValue }) => {
              const type = getFieldValue('connectionType')
              return type === 'SERIAL' ? (
                <>
                  <Row gutter={16}>
                    <Col span={12}><Form.Item name="serialPort" label="Port Name" rules={[{ required: true }]}><Input placeholder="COM1 or /dev/ttyUSB0" /></Form.Item></Col>
                    <Col span={12}><Form.Item name="baudRate" label="Baud Rate"><Select options={[9600, 19200, 38400, 57600, 115200].map(v => ({ label: v, value: v }))} /></Form.Item></Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={8}><Form.Item name="dataBits" label="Data Bits"><Select options={[7, 8].map(v => ({ label: v, value: v }))} /></Form.Item></Col>
                    <Col span={8}><Form.Item name="stopBits" label="Stop Bits"><Select options={[1, 2].map(v => ({ label: v, value: v }))} /></Form.Item></Col>
                    <Col span={8}><Form.Item name="parity" label="Parity"><Select options={['none', 'even', 'odd'].map(v => ({ label: v, value: v }))} /></Form.Item></Col>
                  </Row>
                </>
              ) : (
                <>
                  <Row gutter={8} align="bottom">
                    <Col span={14}><Form.Item name="ip" label="IP Address" rules={[{ required: true }]}><Input placeholder="192.168.1.100" /></Form.Item></Col>
                    <Col span={6}><Form.Item name="port" label="Port"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={4}>
                      <Form.Item>
                        <Button onClick={async () => {
                          const ip = formGateway.getFieldValue('ip')
                          const port = formGateway.getFieldValue('port')
                          if (!ip) return messageApi.error('Enter IP first')
                          const res = await authFetch('/modbus/test-connection', {
                            method: 'POST', body: JSON.stringify({ ip, port, unitId: 1 })
                          })
                          const d = await res.json()
                          d.success ? messageApi.success(d.message) : messageApi.error(d.message)
                        }}>Ping</Button>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item name="timeout" label="Timeout (ms)"><InputNumber min={500} step={500} style={{ width: '100%' }} /></Form.Item>
                </>
              )
            }}
          </Form.Item>

          <Form.Item name="pollingInterval" label="Default Polling (ms)" tooltip="Leave blank to use system default">
            <InputNumber style={{ width: '100%' }} placeholder={`Default: ${globalPollingInterval}ms`} min={500} step={500} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Add Gateway</Button>
        </Form>
      </Modal>

      {/* Add Device Modal (Simplified for Child) */}
      <Modal title="Add Device to Network" open={isDeviceModalOpen} onCancel={() => setIsDeviceModalOpen(false)} footer={null}>
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">Parent Gateway: </Text>
          <Text strong>{selectedGateway?.device_name} ({selectedGateway?.ip_address})</Text>
        </div>
        <Form form={formDevice} layout="vertical" onFinish={handleAddDevice}>
          <Form.Item name="name" label="Device Name" rules={[{ required: true }]}><Input placeholder="e.g. Power Meter 01" /></Form.Item>
          <Form.Item name="unitId" label="Unit ID" initialValue={1} rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1} max={255} /></Form.Item>

          <div style={{ marginBottom: 16, border: '1px dashed #d9d9d9', padding: 12, borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text strong style={{ fontSize: 12 }}>Device Tuning (Advanced)</Text>
              <Button size="small" type="dashed" onClick={() => {
                const current = formDevice.getFieldValue('byteOrderFloat')
                const next = current === 'Order1032' ? 'Order3210' : 'Order1032' // Simple toggle
                formDevice.setFieldsValue({ byteOrderFloat: next, byteOrderLong: next })
              }}>Swap Byte Order</Button>
            </div>
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item name="byteOrderFloat" label="Float Order" initialValue="Order3210">
                  <Select options={[{ value: 'Order3210', label: 'Big Endian (ABCD)' }, { value: 'Order1032', label: 'Little Endian (CDAB) - Swap Words' }]} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="byteOrderLong" label="Long Order" initialValue="Order3210">
                  <Select options={[{ value: 'Order3210', label: 'Big Endian' }, { value: 'Order1032', label: 'Little Endian' }]} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="timeout" label="Response Timeout (ms)">
              <InputNumber style={{ width: '100%' }} placeholder="Inherit from Gateway" step={500} />
            </Form.Item>
          </div>

          <Form.Item name="pollingInterval" label="Polling Interval (ms)" tooltip="Override Gateway Default">
            <InputNumber style={{ width: '100%' }} placeholder="Default" min={500} step={500} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Add Device</Button>
        </Form>
      </Modal>

      {/* Edit Polling Modal */}
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

      {/* Add Point Modal */}
      <Modal title="Add Modbus Point" open={isPointModalOpen} onCancel={() => setIsPointModalOpen(false)} footer={null}>
        <Form form={formPoint} layout="vertical" onFinish={handleAddPoint}>
          <Form.Item name="name" label="Point Name" rules={[{ required: true }]}><Input /></Form.Item>

          <Form.Item name="registerType" label="Register Type" initialValue="HOLDING_REGISTER">
            <Select>
              <Select.Option value="COIL">Coil</Select.Option>
              <Select.Option value="HOLDING_REGISTER">Holding Register</Select.Option>
              <Select.Option value="INPUT_REGISTER">Input Register</Select.Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}><Form.Item name="address" label="Address" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="dataType" label="Data Type" initialValue="INT16"><Select><Select.Option value="INT16">INT16</Select.Option><Select.Option value="UINT16">UINT16</Select.Option><Select.Option value="BOOL">Boolean</Select.Option></Select></Form.Item></Col>
          </Row>
          <Form.Item name="dataFormat" label="Format" initialValue="RAW">
            <Select>
              <Select.Option value="RAW">Raw</Select.Option>
              <Select.Option value="TEMP_C_100">Temp /100 (°C)</Select.Option>
              <Select.Option value="TEMP_C_10">Temp /10 (°C)</Select.Option>
              <Select.Option value="HUMIDITY_10">Humidity /10 (%RH)</Select.Option>
              <Select.Option value="SCALE_0.1">Scale /10 (Generic)</Select.Option>
              <Select.Option value="SCALE_0.01">Scale /100 (Generic)</Select.Option>
              <Select.Option value="VOLT_V">Voltage (V)</Select.Option>
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Add Point</Button>
        </Form>
      </Modal>

      <WriteValueModal open={isWriteModalOpen} point={writingPoint} currentValue={getScaledValue(writingPoint, pointValues.get(writingPoint?.id || 0)?.value)} writeValue={writeValue} priority={0} loading={isWriting} onClose={() => setIsWriteModalOpen(false)} onWrite={handleWrite} onValueChange={setWriteValue} onPriorityChange={() => { }} />
      <ProfileModal open={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

      {/* History Modal (Popup) */}
      <Modal
        title={null}
        open={historyPoint !== null}
        onCancel={() => setHistoryPoint(null)}
        footer={null}
        width={1000}
        styles={{ body: { padding: 0 } }}
        destroyOnClose
      >
        {historyPoint && selectedDevice && (
          <HistoryGraphPanel
            initialSelection={[{ deviceName: selectedDevice.device_name, pointName: historyPoint.point_name }]}
          />
        )}
      </Modal>
    </DashboardLayout>
  )
}