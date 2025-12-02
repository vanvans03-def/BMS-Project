/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import { 
  Layout, Menu, Button, Typography, Space, Card, Modal, 
  Form, Input, InputNumber, Select, message, Row, Col, 
  Statistic, theme, Dropdown, Avatar, Tabs, Divider, Alert
} from 'antd'
import { 
  AppstoreOutlined, SettingOutlined, FileTextOutlined,
  UserOutlined, ReloadOutlined, PlusOutlined,
  DatabaseOutlined, ArrowLeftOutlined, LogoutOutlined, 
  DownOutlined, HddOutlined, ThunderboltOutlined,
  GlobalOutlined, ApiOutlined, SaveOutlined
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import AOS from 'aos'

// Utils & Contexts
import { authFetch } from './utils/authFetch'
import { useAuth } from './contexts/AuthContext'

// Components
import { ModbusDeviceTable } from './components/ModbusDeviceTable'
import { ModbusPointTable } from './components/ModbusPointTable'
import { WriteValueModal } from './components/WriteValueModal'
import { LogsPage } from './components/LogsPage'
// Reuse Settings Components
import { GeneralSettings, UserSettings, DatabaseSettings } from './components/SettingsTabs' 
import { ProfileModal } from './components/ProfileModal'

const { Header, Content, Sider } = Layout
const { Title, Text } = Typography

interface ModbusAppProps {
  onBack: () => void
}

// --- Component ย่อยสำหรับตั้งค่า Network ของ Modbus ---
const ModbusNetworkSettings = () => {
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const res = await authFetch('/settings')
            const data = await res.json()
            form.setFieldsValue(data)
        } catch (err) {
            console.error(err)
        }
    }

    const onFinish = async (values: any) => {
        setLoading(true)
        try {
            await authFetch('/settings', {
                method: 'PUT',
                body: JSON.stringify(values)
            })
            message.success('Modbus settings saved')
        } catch (err) {
            message.error('Failed to save settings')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <div data-aos="fade-up">
                <Title level={5}><ApiOutlined /> Modbus Communication</Title>
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item name="polling_interval" label="Polling Interval (ms)" extra="Default: 3000ms">
                                <InputNumber style={{ width: '100%' }} step={100} min={500} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="modbus_timeout" label="Request Timeout (ms)" extra="Wait time for device response">
                                <InputNumber style={{ width: '100%' }} step={100} min={500} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Divider />
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                        Save Configuration
                    </Button>
                </Form>
            </div>
        </Card>
    )
}

export const ModbusApp = ({ onBack }: ModbusAppProps) => {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [currentView, setCurrentView] = useState<'dashboard' | 'detail' | 'settings' | 'logs'>('dashboard')
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken()
  
  // State สำหรับ Profile
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  // Data States
  const [selectedDevice, setSelectedDevice] = useState<any>(null)
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false)
  const [isPointModalOpen, setIsPointModalOpen] = useState(false)
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false)
  const [writingPoint, setWritingPoint] = useState<any>(null)
  const [pointValues, setPointValues] = useState<Map<number, any>>(new Map())
  
  const [formDevice] = Form.useForm()
  const [formPoint] = Form.useForm()
  const [messageApi, contextHolder] = message.useMessage()

  useEffect(() => {
    AOS.refresh()
  }, [currentView, selectedDevice])

  // --- Queries ---
  const { data: devices, isLoading: loadingDevices, refetch: refetchDevices } = useQuery({
    queryKey: ['modbus-devices'],
    queryFn: async () => {
      const res = await authFetch('/devices')
      const all = await res.json()
      // กรองเฉพาะ Modbus
      return Array.isArray(all) ? all.filter((d: any) => d.protocol === 'MODBUS') : []
    },
    refetchInterval: 10000 // Refresh device list every 10s
  })

  const { data: points, isLoading: loadingPoints, refetch: refetchPoints } = useQuery({
    queryKey: ['modbus-points', selectedDevice?.id],
    enabled: !!selectedDevice && currentView === 'detail',
    queryFn: async () => {
      const res = await authFetch(`/points/${selectedDevice.id}`)
      const data = await res.json()
      return Array.isArray(data) ? data : (data.points || [])
    }
  })

  // --- Polling Logic ---
  useEffect(() => {
    if (currentView !== 'detail' || !selectedDevice) return

    const fetchValues = async () => {
      try {
        const res = await authFetch('/monitor/read-device-points', {
          method: 'POST',
          body: JSON.stringify({ deviceId: selectedDevice.id })
        })
        const data = await res.json()
        if (data.success && data.values) {
          const map = new Map()
          data.values.forEach((v: any) => map.set(v.pointId, v))
          setPointValues(map)
        }
      } catch (err) {
        console.error('Polling error', err)
      }
    }

    fetchValues()
    const interval = setInterval(fetchValues, 3000) 
    return () => clearInterval(interval)
  }, [currentView, selectedDevice])

  // --- Handlers ---
  const handleMenuClick = (key: string) => {
    if (key === '1') {
        setCurrentView('dashboard')
        setSelectedDevice(null)
    }
    else if (key === '2') setCurrentView('settings')
    else if (key === '3') setCurrentView('logs')
  }

  const handleAddDevice = async (values: any) => {
    try {
      const payload = [{
        device_name: values.name,
        device_instance_id: Math.floor(Math.random() * 100000), // Mock Unique ID for internal logic
        ip_address: values.ip,
        network_number: 0,
        protocol: 'MODBUS',
        unit_id: values.unitId
      }]

      const res = await authFetch('/devices', { method: 'POST', body: JSON.stringify(payload) })
      if (res.ok) {
        messageApi.success('Modbus Device Added')
        setIsDeviceModalOpen(false)
        formDevice.resetFields()
        refetchDevices()
      } else {
        messageApi.error('Failed to add device')
      }
    } catch (err) {
      messageApi.error('Error adding device')
    }
  }

  const handleAddPoint = async (values: any) => {
    // NOTE: ส่วนนี้ต้องรอ Backend API /points create
    // ตอนนี้ Mock ไว้ก่อน
    messageApi.info('Feature: Add Point API pending')
    setIsPointModalOpen(false)
  }

  const handleWrite = async () => {
    // NOTE: รอ Backend Service Implement writeCoil/writeRegister
    messageApi.success('Write command sent (Mock)')
    setIsWriteModalOpen(false)
  }

  // --- User Menu Dropdown ---
  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: 'Profile', onClick: () => setIsProfileModalOpen(true) },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true, onClick: logout }
    ]
  }

  // --- Render Sections ---
  const renderDashboard = () => (
    <>
      <div style={{ marginBottom: 24 }} data-aos="fade-down">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Title level={3} style={{ margin: 0, marginBottom: 8 }}>
              <HddOutlined /> Modbus Manager
            </Title>
            <Text type="secondary">Monitor and control Modbus TCP devices</Text>
          </Col>
          <Col xs={24} md={12} style={{ textAlign: 'right' }}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetchDevices()}>Refresh</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsDeviceModalOpen(true)}>
                Add Device
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <div data-aos="fade-up" data-aos-delay="100">
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={12} md={6}>
            <Card>
                <Statistic title="Total Devices" value={devices?.length || 0} prefix={<DatabaseOutlined />} />
            </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
            <Card>
                <Statistic title="Online" value={devices?.length || 0} valueStyle={{ color: '#3f8600' }} prefix={<ThunderboltOutlined />} />
            </Card>
            </Col>
        </Row>
      </div>

      <div data-aos="fade-up" data-aos-delay="200">
        <Card title="Device List">
            <ModbusDeviceTable 
                devices={devices || []} 
                loading={loadingDevices}
                onView={(dev) => {
                    setSelectedDevice(dev)
                    setCurrentView('detail')
                }}
                onDelete={(id) => messageApi.info(`Delete ID: ${id} (Implement API)`)}
            />
        </Card>
      </div>
    </>
  )

  const renderDetail = () => (
    <>
      <div data-aos="fade-down">
        <Card style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]} align="middle">
                <Col xs={24} md={12}>
                    <Space direction="vertical" size={0}>
                        <Button 
                            icon={<ArrowLeftOutlined />} 
                            onClick={() => {
                                setSelectedDevice(null)
                                setCurrentView('dashboard')
                            }} 
                            type="link" 
                            style={{ padding: 0, marginBottom: 8 }}
                        >
                            Back to Device List
                        </Button>
                        <Title level={4} style={{ margin: 0 }}>{selectedDevice?.device_name}</Title>
                        <Space split={<Divider type="vertical" />}>
                            <Text type="secondary"><GlobalOutlined /> {selectedDevice?.ip_address}</Text>
                            <Text type="secondary">Unit ID: {selectedDevice?.unit_id}</Text>
                        </Space>
                    </Space>
                </Col>
                <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                    <Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsPointModalOpen(true)}>
                            Add Point
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={() => refetchPoints()}>Refresh</Button>
                    </Space>
                </Col>
            </Row>
        </Card>
      </div>

      <div data-aos="fade-up" data-aos-delay="100">
        <Card>
            <ModbusPointTable 
                points={points || []} 
                pointValues={pointValues} 
                loading={loadingPoints}
                onWrite={(pt) => {
                    setWritingPoint(pt)
                    setIsWriteModalOpen(true)
                }}
            />
        </Card>
      </div>
    </>
  )

  const renderSettings = () => (
    <>
        <div style={{ marginBottom: 24 }} data-aos="fade-down">
            <Title level={3} style={{ margin: 0, marginBottom: 8 }}>
            <SettingOutlined /> System Settings
            </Title>
            <Text type="secondary">Configure Modbus driver, users, and system preferences</Text>
        </div>
        <div data-aos="fade-up" data-aos-delay="100">
            <Card>
                <Tabs
                    defaultActiveKey="general"
                    items={[
                        { key: 'general', label: <span><GlobalOutlined /> General</span>, children: <GeneralSettings /> },
                        { key: 'network', label: <span><ApiOutlined /> Modbus Config</span>, children: <ModbusNetworkSettings /> },
                        { key: 'users', label: <span><UserOutlined /> Users</span>, children: <UserSettings /> },
                        { key: 'database', label: <span><DatabaseOutlined /> Database</span>, children: <DatabaseSettings /> },
                    ]}
                />
            </Card>
        </div>
    </>
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {contextHolder}

      {/* Header - Consistent with BACnet */}
      <Header style={{ 
          display: 'flex', alignItems: 'center', padding: '0 16px', 
          background: '#001529', position: 'sticky', top: 0, zIndex: 1000 
      }}>
        <Space style={{ cursor: 'pointer' }} onClick={onBack}>
            <ArrowLeftOutlined style={{ color: 'white', fontSize: 18 }} />
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 600 }}>Portal</Text>
        </Space>
        
        <Divider type="vertical" style={{ background: 'rgba(255,255,255,0.2)', margin: '0 16px' }} />
        
        <HddOutlined style={{ fontSize: 24, marginRight: 12, color: '#faad14' }} />
        <Title level={4} style={{ margin: 0, color: 'white' }}>Modbus System</Title>
        
        <div style={{ flex: 1 }} />
        <Dropdown menu={userMenu} trigger={['click']}>
            <Button type="text" style={{ color: 'white', padding: '4px 12px' }}>
                <Space>
                    <Avatar style={{ backgroundColor: '#faad14' }} icon={<UserOutlined />} />
                    <Text style={{ color: 'white' }}>{user?.username || 'User'}</Text>
                    <DownOutlined />
                </Space>
            </Button>
        </Dropdown>
      </Header>

      <Layout>
        <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            theme="light"
            width={220}
            breakpoint="lg"
        >
            <Menu
                mode="inline"
                defaultSelectedKeys={['1']}
                selectedKeys={[currentView === 'dashboard' || currentView === 'detail' ? '1' : currentView === 'settings' ? '2' : '3']}
                onClick={({ key }) => handleMenuClick(key)}
                items={[
                    { key: '1', icon: <AppstoreOutlined />, label: 'Dashboard' },
                    { key: '2', icon: <SettingOutlined />, label: 'Settings' },
                    { key: '3', icon: <FileTextOutlined />, label: 'Logs' },
                ]}
                style={{ borderRight: 0 }}
            />
        </Sider>

        <Layout style={{ padding: '16px' }}>
            <Content
                style={{
                    padding: 24,
                    margin: 0,
                    background: colorBgContainer,
                    borderRadius: borderRadiusLG,
                    minHeight: 'calc(100vh - 64px - 32px)',
                    overflow: 'initial'
                }}
            >
                {currentView === 'dashboard' && renderDashboard()}
                {currentView === 'detail' && renderDetail()}
                {currentView === 'settings' && renderSettings()}
                {/* Reuse LogsPage directly - later we can add protocol filter props if needed */}
                {currentView === 'logs' && <LogsPage />}
            </Content>
        </Layout>
      </Layout>

      {/* Modals */}
      <Modal 
        title="Add Modbus Device" 
        open={isDeviceModalOpen} 
        onCancel={() => setIsDeviceModalOpen(false)} 
        footer={null}
      >
        <Form form={formDevice} layout="vertical" onFinish={handleAddDevice}>
            <Form.Item name="name" label="Device Name" rules={[{ required: true }]}>
                <Input placeholder="e.g., Meter-01" />
            </Form.Item>
            <Row gutter={16}>
                <Col span={16}>
                    <Form.Item name="ip" label="IP Address" rules={[{ required: true }]}>
                        <Input placeholder="192.168.1.50" />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item name="unitId" label="Unit ID" initialValue={1}>
                        <InputNumber min={1} max={255} style={{ width: '100%' }} />
                    </Form.Item>
                </Col>
            </Row>
            <Button type="primary" htmlType="submit" block>Add Device</Button>
        </Form>
      </Modal>

      <Modal 
        title="Add Register / Coil" 
        open={isPointModalOpen} 
        onCancel={() => setIsPointModalOpen(false)} 
        footer={null}
      >
        <Form form={formPoint} layout="vertical" onFinish={handleAddPoint}>
            <Form.Item name="name" label="Point Name" rules={[{ required: true }]}>
                <Input />
            </Form.Item>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item name="type" label="Type" initialValue="HOLDING_REGISTER">
                        <Select>
                            <Select.Option value="COIL">Coil (Boolean)</Select.Option>
                            <Select.Option value="HOLDING_REGISTER">Holding Register</Select.Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item name="address" label="Address" rules={[{ required: true }]}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                </Col>
            </Row>
            <Button type="primary" htmlType="submit" block>Add Point</Button>
        </Form>
      </Modal>

      <WriteValueModal
        open={isWriteModalOpen}
        point={writingPoint}
        currentValue={pointValues.get(writingPoint?.id)?.value}
        writeValue=""
        priority={0}
        loading={false}
        onClose={() => setIsWriteModalOpen(false)}
        onWrite={handleWrite}
        onValueChange={() => {}}
        onPriorityChange={() => {}}
      />

      <ProfileModal 
        open={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </Layout>
  )
}