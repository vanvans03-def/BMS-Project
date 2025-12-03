/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react'
import { Button, Typography, Space, Card, Modal, Form, Input, InputNumber, Select, message, Row, Col, Statistic, Divider, Tabs } from 'antd'
import { 
  ReloadOutlined, PlusOutlined, DatabaseOutlined, 
  HddOutlined, ThunderboltOutlined, ArrowLeftOutlined, 
  GlobalOutlined, ApiOutlined, UserOutlined, SaveOutlined
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import AOS from 'aos'

import { authFetch } from '../../utils/authFetch'
import { DashboardLayout } from '../../components/layout/DashboardLayout'

// Components
import { ModbusDeviceTable } from './ModbusDeviceTable'
import { ModbusPointTable } from './ModbusPointTable'
import { WriteValueModal } from '../../components/WriteValueModal'
import { GeneralSettings, UserSettings, DatabaseSettings } from '../../components/SettingsTabs'
import { LogsPage } from '../../components/LogsPage'
import { ProfileModal } from '../../components/ProfileModal'


import type { Device, Point, PointValue } from '../../types/common'

const { Title, Text } = Typography

// Internal Settings Component
const ModbusNetworkSettings = () => {
    const [form] = Form.useForm(); const [loading, setLoading] = useState(false)
    useEffect(() => { authFetch('/settings').then(res => res.json()).then(data => form.setFieldsValue(data)) }, [])
    const onFinish = async (v: any) => {
        setLoading(true)
        try { await authFetch('/settings', { method: 'PUT', body: JSON.stringify(v) }); message.success('Saved') }
        catch { message.error('Failed') } finally { setLoading(false) }
    }
    return (
        <Card>
            <div data-aos="fade-up">
                <Title level={5}><ApiOutlined /> Modbus Config</Title>
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <Row gutter={16}>
                        <Col xs={12}><Form.Item name="polling_interval" label="Polling Interval (ms)"><InputNumber style={{width:'100%'}}/></Form.Item></Col>
                        <Col xs={12}><Form.Item name="modbus_timeout" label="Timeout (ms)"><InputNumber style={{width:'100%'}}/></Form.Item></Col>
                    </Row>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined/>} loading={loading}>Save</Button>
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
  
  // Modals
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false)
  const [isPointModalOpen, setIsPointModalOpen] = useState(false)
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  const [writingPoint, setWritingPoint] = useState<Point | null>(null)
  const [pointValues, setPointValues] = useState<Map<number, PointValue>>(new Map())
  
  const [formDevice] = Form.useForm(); const [formPoint] = Form.useForm()

  useEffect(() => { AOS.refresh() }, [currentView, selectedDevice])

  // Queries
  const { data: devices, isLoading: loadingDevices, refetch: refetchDevices } = useQuery<Device[]>({
    queryKey: ['modbus-devices'],
    queryFn: async () => {
      const res = await authFetch('/devices')
      const all = await res.json()
      return Array.isArray(all) ? all.filter((d: any) => d.protocol === 'MODBUS') : []
    }
  })

  const { data: points, isLoading: loadingPoints, refetch: refetchPoints } = useQuery<Point[]>({
    queryKey: ['modbus-points', selectedDevice?.id],
    enabled: !!selectedDevice && currentView === 'detail',
    queryFn: async () => {
      const res = await authFetch(`/points/${selectedDevice!.id}`)
      return (await res.json()).points || []
    }
  })

  // Polling
  useEffect(() => {
    if (currentView !== 'detail' || !selectedDevice) return
    const fetchVal = async () => {
        try {
            const res = await authFetch('/monitor/read-device-points', { method: 'POST', body: JSON.stringify({ deviceId: selectedDevice.id }) })
            const data = await res.json()
            if (data.success) {
                const map = new Map(); data.values.forEach((v: PointValue) => map.set(v.pointId, v))
                setPointValues(map)
            }
        } catch {}
    }
    const interval = setInterval(fetchVal, 3000)
    return () => clearInterval(interval)
  }, [currentView, selectedDevice])

  // Handlers
  const handleAddDevice = async (v: any) => {
    try {
      await authFetch('/devices', { method: 'POST', body: JSON.stringify([{
        device_name: v.name, device_instance_id: Math.floor(Math.random()*100000),
        ip_address: v.ip, network_number: 0, protocol: 'MODBUS', unit_id: v.unitId
      }])})
      messageApi.success('Added'); setIsDeviceModalOpen(false); formDevice.resetFields(); refetchDevices()
    } catch { messageApi.error('Error') }
  }

  const handleWrite = () => { messageApi.success('Command Sent (Mock)'); setIsWriteModalOpen(false) }

  // Renderers
  const renderDashboard = () => (
    <>
      <div style={{ marginBottom: 24 }} data-aos="fade-down">
        <Row gutter={16} align="middle">
          <Col flex="auto"><Title level={3} style={{ margin: 0 }}>Modbus Manager</Title></Col>
          <Col><Space><Button icon={<ReloadOutlined />} onClick={() => refetchDevices()}>Refresh</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setIsDeviceModalOpen(true)}>Add Device</Button></Space></Col>
        </Row>
      </div>
      
      {/* [UPDATED] เพิ่ม data-aos="fade-up" ให้ Stats Cards */}
      <div data-aos="fade-up">
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} md={8}><Card><Statistic title="Total Devices" value={devices?.length||0} prefix={<DatabaseOutlined />} /></Card></Col>
            <Col xs={12} md={8}><Card><Statistic title="Online" value={devices?.length||0} valueStyle={{ color: '#3f8600' }} prefix={<ThunderboltOutlined />} /></Card></Col>
        </Row>
      </div>

      {/* [UPDATED] เพิ่ม data-aos="fade-up" และ delay ให้ Device Table Card */}
      <div data-aos="fade-up" data-aos-delay="200">
        <Card title="Device List">
            <ModbusDeviceTable devices={devices||[]} loading={loadingDevices} onView={(d: any) => { setSelectedDevice(d); setCurrentView('detail') }} onDelete={()=>{}} />
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
                    <Button icon={<ArrowLeftOutlined />} type="link" onClick={() => { setSelectedDevice(null); setCurrentView('dashboard') }}>Back</Button>
                    <Title level={4} style={{ margin: 0 }}>{selectedDevice?.device_name}</Title>
                    <Text type="secondary"><GlobalOutlined /> {selectedDevice?.ip_address} (Unit: {selectedDevice?.unit_id})</Text>
                </Col>
                <Col><Space><Button type="primary" icon={<PlusOutlined />} onClick={() => setIsPointModalOpen(true)}>Add Point</Button><Button icon={<ReloadOutlined />} onClick={() => refetchPoints()}>Refresh</Button></Space></Col>
            </Row>
        </Card>
      </div>
      
      {/* [UPDATED] เพิ่ม data-aos ให้ส่วนตาราง Point ด้วย */}
      <div data-aos="fade-up" data-aos-delay="200">
        <Card>
            <ModbusPointTable points={points||[]} pointValues={pointValues} loading={loadingPoints} onWrite={(p: any) => { setWritingPoint(p); setIsWriteModalOpen(true) }} />
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
        onMenuClick={(k) => { setCurrentView(k); if(k==='dashboard') setSelectedDevice(null) }}
        onProfileClick={() => setIsProfileModalOpen(true)}
    >
        {contextHolder}
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'detail' && renderDetail()}
        {currentView === 'settings' && (
            <Card>
                <Tabs items={[
                    { key: 'general', label: <span><GlobalOutlined /> General</span>, children: <GeneralSettings /> },
                    { key: 'network', label: <span><ApiOutlined /> Config</span>, children: <ModbusNetworkSettings /> },
                    { key: 'users', label: <span><UserOutlined /> Users</span>, children: <UserSettings /> },
                    { key: 'database', label: <span><DatabaseOutlined /> Database</span>, children: <DatabaseSettings /> },
                ]} />
            </Card>
        )}
        {currentView === 'logs' && <LogsPage />}

        <Modal title="Add Modbus Device" open={isDeviceModalOpen} onCancel={() => setIsDeviceModalOpen(false)} footer={null}>
            <Form form={formDevice} layout="vertical" onFinish={handleAddDevice}>
                <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
                <Row gutter={16}><Col span={16}><Form.Item name="ip" label="IP" rules={[{ required: true }]}><Input /></Form.Item></Col><Col span={8}><Form.Item name="unitId" label="Unit ID" initialValue={1}><InputNumber style={{width:'100%'}} /></Form.Item></Col></Row>
                <Button type="primary" htmlType="submit" block>Add</Button>
            </Form>
        </Modal>
        
        <Modal title="Add Point" open={isPointModalOpen} onCancel={() => setIsPointModalOpen(false)} footer={null}>
            <Form form={formPoint} layout="vertical" onFinish={() => setIsPointModalOpen(false)}>
                <Form.Item name="name" label="Name"><Input/></Form.Item>
                <Button type="primary" htmlType="submit" block>Add (Mock)</Button>
            </Form>
        </Modal>

        <WriteValueModal open={isWriteModalOpen} point={writingPoint} currentValue={pointValues.get(writingPoint?.id||0)?.value} writeValue="" priority={0} loading={false} onClose={() => setIsWriteModalOpen(false)} onWrite={handleWrite} onValueChange={()=>{}} onPriorityChange={()=>{}} />
        <ProfileModal open={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </DashboardLayout>
  )
}