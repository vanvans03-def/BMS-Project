/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react'
import { Button, Typography, Space, Card, Modal, Form, Input, InputNumber, Select, message, Row, Col, Statistic, Tabs } from 'antd'
import { 
  ReloadOutlined, PlusOutlined, DatabaseOutlined, 
  HddOutlined, ThunderboltOutlined, ArrowLeftOutlined, 
  GlobalOutlined, ApiOutlined, UserOutlined, SaveOutlined
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
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

// Modbus Network Settings Component
const ModbusNetworkSettings = () => {
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    
    useEffect(() => { 
      authFetch('/settings').then(res => res.json()).then(data => form.setFieldsValue(data)) 
    }, [form])
    
    const onFinish = async (v: any) => {
        setLoading(true)
        try { 
          await authFetch('/settings', { method: 'PUT', body: JSON.stringify(v) })
          message.success('Saved') 
        } catch { 
          message.error('Failed') 
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
                          <Form.Item name="polling_interval" label="Polling Interval (ms)">
                            <InputNumber style={{width:'100%'}} min={1000} step={1000} />
                          </Form.Item>
                        </Col>
                        <Col xs={12}>
                          <Form.Item name="modbus_timeout" label="Timeout (ms)">
                            <InputNumber style={{width:'100%'}} min={1000} step={1000} />
                          </Form.Item>
                        </Col>
                    </Row>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined/>} loading={loading}>
                      Save Configuration
                    </Button>
                </Form>
            </div>
        </Card>
    )
}

interface ModbusAppProps { onBack: () => void }

export default function ModbusApp({ onBack }: ModbusAppProps) {
  const [currentView, setCurrentView] = useState<string>('dashboard')
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [messageApi, contextHolder] = message.useMessage()
  
  // Modals & Forms
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false)
  const [isPointModalOpen, setIsPointModalOpen] = useState(false)
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  const [writingPoint, setWritingPoint] = useState<Point | null>(null)
  const [writeValue, setWriteValue] = useState<string | number>("")
  const [isWriting, setIsWriting] = useState(false)
  
  const [pointValues, setPointValues] = useState<Map<number, PointValue>>(new Map())
  
  const [formDevice] = Form.useForm()
  const [formPoint] = Form.useForm()

  useEffect(() => { AOS.refresh() }, [currentView, selectedDevice])

  // Queries
  const { data: devices, isLoading: loadingDevices, refetch: refetchDevices } = useQuery<Device[]>({
    queryKey: ['modbus-devices'],
    queryFn: async () => {
      const res = await authFetch('/devices')
      const all = await res.json()
      return Array.isArray(all) ? all.filter((d: any) => d.protocol === 'MODBUS') : []
    },
    refetchInterval: 10000
  })

  const { data: points, isLoading: loadingPoints, refetch: refetchPoints } = useQuery<Point[]>({
    queryKey: ['modbus-points', selectedDevice?.id],
    enabled: !!selectedDevice && currentView === 'detail',
    queryFn: async () => {
      const res = await authFetch(`/points/${selectedDevice!.id}`)
      const data = await res.json()
      return Array.isArray(data) ? data : data.points || []
    }
  })

  // Polling for values
  useEffect(() => {
    if (currentView !== 'detail' || !selectedDevice) return
    
    const fetchVal = async () => {
        try {
            const res = await authFetch('/monitor/read-device-points', { 
              method: 'POST', 
              body: JSON.stringify({ deviceId: selectedDevice.id }) 
            })
            const data = await res.json()
            
            if (data.success && data.values) {
                const map = new Map()
                // รับค่า Raw Data มาตรงๆ (2500)
                data.values.forEach((v: PointValue) => {
                    map.set(v.pointId, v)
                })
                setPointValues(map)
            }
        } catch (err) {
          console.error('Polling error:', err)
        }
    }
    
    fetchVal()
    const interval = setInterval(fetchVal, 3000)
    return () => clearInterval(interval)
  }, [currentView, selectedDevice])

  // [NEW] Helper Function สำหรับแปลงค่า Raw เป็นค่าทศนิยมเพื่อแสดงผล
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
          unit_id: values.unitId
        }])
      })
      messageApi.success('Device added successfully')
      setIsDeviceModalOpen(false)
      formDevice.resetFields()
      refetchDevices()
    } catch (err) {
      messageApi.error('Failed to add device')
    }
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
          dataType: values.dataType || 'INT16',
          dataFormat: values.dataFormat || 'RAW'
        })
      })
      
      const result = await res.json()
      if (result.success) {
        messageApi.success('Point added successfully')
        setIsPointModalOpen(false)
        formPoint.resetFields()
        refetchPoints()
      } else {
        messageApi.error(result.message || 'Failed to add point')
      }
    } catch (err) {
      messageApi.error('Failed to add point')
    }
  }

  const handleDeleteDevice = async (id: number) => {
    try {
      await authFetch(`/devices/${id}`, { method: 'DELETE' })
      messageApi.success('Device deleted')
      refetchDevices()
    } catch {
      messageApi.error('Delete failed')
    }
  }

  const handleDeletePoint = async (id: number) => {
    try {
      const res = await authFetch(`/modbus/point/${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (result.success) {
        messageApi.success('Point deleted')
        refetchPoints()
      }
    } catch {
      messageApi.error('Delete failed')
    }
  }

  const handleWrite = async () => {
    if (!writingPoint) return
    setIsWriting(true)
    
    try {
      const endpoint = writingPoint.register_type === 'COIL' 
        ? '/modbus/write-coil' 
        : '/modbus/write-register'
      
      let value: number | boolean = writingPoint.register_type === 'COIL'
        ? (writeValue === 1 || writeValue === 'true')
        : Number(writeValue)

      // จัดการค่า Holding Register (ตัวเลข)
      if (writingPoint.register_type === 'HOLDING_REGISTER' && typeof value === 'number') {
          // Scaling: แปลงจากทศนิยมกลับเป็นจำนวนเต็ม (20.5 -> 2050)
          switch (writingPoint.data_format) {
              case 'TEMP_C_100':
                  value = Math.round(value * 100)
                  break
              case 'TEMP_C_10':
                  value = Math.round(value * 10)
                  break
          }
      }
      
      const res = await authFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ pointId: writingPoint.id, value })
      })
      
      const result = await res.json()
      if (result.success) {
        messageApi.success('Write command sent successfully')
        setIsWriteModalOpen(false)
        setTimeout(() => refetchPoints(), 1000)
      } else {
        messageApi.error(result.message || 'Write failed')
      }
    } catch (err) {
      messageApi.error('Write command failed')
    } finally {
      setIsWriting(false)
    }
  }

  // Renderers
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
              <Button icon={<ReloadOutlined />} onClick={() => refetchDevices()}>
                Refresh
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsDeviceModalOpen(true)}>
                Add Device
              </Button>
            </Space>
          </Col>
        </Row>
      </div>
      
      <div data-aos="fade-up">
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} md={8}>
              <Card>
                <Statistic 
                  title="Total Devices" 
                  value={devices?.length || 0} 
                  prefix={<DatabaseOutlined />} 
                />
              </Card>
            </Col>
            <Col xs={12} md={8}>
              <Card>
                <Statistic 
                  title="Online" 
                  value={devices?.filter(d => d.is_active).length || 0} 
                  valueStyle={{ color: '#3f8600' }} 
                  prefix={<ThunderboltOutlined />} 
                />
              </Card>
            </Col>
            <Col xs={12} md={8}>
              <Card>
                <Statistic 
                  title="Total Points" 
                  value={0} 
                  prefix={<HddOutlined />} 
                />
              </Card>
            </Col>
        </Row>
      </div>

      <div data-aos="fade-up" data-aos-delay="200">
        <Card title="Device List">
            <ModbusDeviceTable 
              devices={devices || []} 
              loading={loadingDevices} 
              onView={(d: any) => { setSelectedDevice(d); setCurrentView('detail') }} 
              onDelete={handleDeleteDevice} 
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
                    <Button 
                      icon={<ArrowLeftOutlined />} 
                      type="link" 
                      onClick={() => { setSelectedDevice(null); setCurrentView('dashboard') }}
                    >
                      Back
                    </Button>
                    <Title level={4} style={{ margin: 0 }}>{selectedDevice?.device_name}</Title>
                    <Text type="secondary">
                      <GlobalOutlined /> {selectedDevice?.ip_address} | Unit ID: {selectedDevice?.unit_id}
                    </Text>
                </Col>
                <Col>
                    <Space>
                        <Button 
                          type="primary" 
                          icon={<PlusOutlined />} 
                          onClick={() => setIsPointModalOpen(true)}
                        >
                          Add Point
                        </Button>
                        <Button 
                          icon={<ReloadOutlined />} 
                          onClick={() => refetchPoints()}
                        >
                          Refresh
                        </Button>
                    </Space>
                </Col>
            </Row>
        </Card>
      </div>
      
      <div data-aos="fade-up" data-aos-delay="200">
        <Card>
            <ModbusPointTable 
              points={points || []} 
              pointValues={pointValues} 
              loading={loadingPoints} 
              onWrite={(p: Point) => { 
                setWritingPoint(p)
                const currentVal = pointValues.get(p.id)?.value
                
                // [FIXED] แปลงค่า Raw เป็นทศนิยมก่อนนำไปใส่ใน Input ของ Modal
                const scaledVal = getScaledValue(p, currentVal)
                
                setWriteValue(scaledVal ?? "")
                setIsWriteModalOpen(true) 
              }}
              onDelete={handleDeletePoint}
            />
        </Card>
      </div>
    </>
  )

  return (
    <DashboardLayout
        title="Modbus System"
        headerIcon={<HddOutlined />}
        themeColor="#faad14"
        onBack={onBack}
        currentView={currentView === 'detail' ? 'dashboard' : currentView}
        onMenuClick={(k) => { setCurrentView(k); if (k === 'dashboard') setSelectedDevice(null) }}
        onProfileClick={() => setIsProfileModalOpen(true)}
    >
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
        <Modal 
          title="Add Modbus Device" 
          open={isDeviceModalOpen} 
          onCancel={() => setIsDeviceModalOpen(false)} 
          footer={null}
        >
            <Form form={formDevice} layout="vertical" onFinish={handleAddDevice}>
                <Form.Item 
                  name="name" 
                  label="Device Name" 
                  rules={[{ required: true, message: 'Please enter device name' }]}
                >
                  <Input placeholder="e.g. PLC-01" />
                </Form.Item>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item 
                      name="ip" 
                      label="IP Address" 
                      rules={[{ required: true, message: 'Please enter IP' }]}
                    >
                      <Input placeholder="192.168.1.100" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item name="port" label="Port" initialValue={502}>
                      <InputNumber style={{ width: '100%' }} min={1} max={65535} />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item name="unitId" label="Unit ID" initialValue={1}>
                      <InputNumber style={{ width: '100%' }} min={1} max={247} />
                    </Form.Item>
                  </Col>
                </Row>
                <Button type="primary" htmlType="submit" block>Add Device</Button>
            </Form>
        </Modal>
        
        {/* Add Point Modal */}
        <Modal 
          title="Add Modbus Point" 
          open={isPointModalOpen} 
          onCancel={() => setIsPointModalOpen(false)} 
          footer={null}
        >
            <Form form={formPoint} layout="vertical" onFinish={handleAddPoint}>
                <Form.Item 
                  name="name" 
                  label="Point Name" 
                  rules={[{ required: true }]}
                >
                  <Input placeholder="e.g. Temperature Sensor" />
                </Form.Item>
                
                <Form.Item 
                  name="registerType" 
                  label="Register Type" 
                  initialValue="HOLDING_REGISTER"
                  rules={[{ required: true }]}
                >
                  <Select>
                    <Select.Option value="COIL">Coil (Boolean)</Select.Option>
                    <Select.Option value="HOLDING_REGISTER">Holding Register (Number)</Select.Option>
                  </Select>
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item 
                      name="address" 
                      label="Register Address" 
                      rules={[{ required: true }]}
                    >
                      <InputNumber style={{ width: '100%' }} min={0} max={65535} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item 
                        name="dataType" 
                        label="Data Type" 
                        initialValue="INT16"
                        tooltip="INT16 for signed values (-32768 to 32767), UINT16 for unsigned (0 to 65535)"
                    >
                      <Select>
                        <Select.Option value="INT16">INT16 (Signed)</Select.Option>
                        <Select.Option value="UINT16">UINT16 (Unsigned)</Select.Option>
                        <Select.Option value="BOOL">Boolean</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item 
                    name="dataFormat" 
                    label="Display Format" 
                    initialValue="RAW"
                    tooltip="Choose how to display the value"
                >
                    <Select>
                        <Select.Option value="RAW">Raw Data (Default)</Select.Option>
                        <Select.Option value="TEMP_C_100">Temperature °C (÷100)</Select.Option>
                        <Select.Option value="TEMP_C_10">Temperature °C (÷10)</Select.Option>
                        <Select.Option value="VOLT_V">Voltage (V)</Select.Option>
                    </Select>
                </Form.Item>

                <Button type="primary" htmlType="submit" block>Add Point</Button>
            </Form>
        </Modal>

        {/* Write Value Modal */}
        <WriteValueModal 
          open={isWriteModalOpen} 
          point={writingPoint} 
          // [FIXED] แสดงค่า Current Value ใน Modal แบบที่แปลงหน่วยแล้ว
          currentValue={getScaledValue(writingPoint, pointValues.get(writingPoint?.id || 0)?.value)} 
          writeValue={writeValue} 
          priority={0}
          loading={isWriting} 
          onClose={() => setIsWriteModalOpen(false)} 
          onWrite={handleWrite} 
          onValueChange={setWriteValue} 
          onPriorityChange={() => {}}
        />
        
        <ProfileModal open={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </DashboardLayout>
  )
}