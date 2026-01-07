/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button, Input, Space, Typography, Card, message, Badge, Row, Col, Divider, Tabs, Modal, Form, InputNumber } from "antd"
import {
  SearchOutlined, ReloadOutlined, PlusOutlined, DatabaseOutlined,
  WifiOutlined, ArrowLeftOutlined, SyncOutlined, GlobalOutlined,
  ApiOutlined, UserOutlined
} from "@ant-design/icons"
import AOS from 'aos'

import { authFetch } from '../../utils/authFetch'
import { DashboardLayout } from '../../components/layout/DashboardLayout'

import { DeviceTable } from "./DeviceTable"
import { PointTable } from "./PointTable"
import { DiscoveryModal } from "./DiscoveryModal"
import { DeviceStatsCards, PointStatsCards } from "../../components/StatsCards"
import { WriteValueModal } from "../../components/WriteValueModal"
import { GeneralSettings, NetworkSettings, UserSettings, DatabaseSettings } from "../../components/SettingsTabs"
import { LogsPage } from "../../components/LogsPage"
import { ProfileModal } from "../../components/ProfileModal"

import type { Device, Point, PointValue } from "../../types/common"

const { Title, Text } = Typography

interface BACnetAppProps { onBack: () => void; initialDeviceId?: number | null }

export default function BACnetApp({ onBack, initialDeviceId }: BACnetAppProps) {
  // [MODIFIED] Start in 'loading' state if we have a target device
  const [currentView, setCurrentView] = useState<string>(initialDeviceId ? "loading" : "dashboard")
  const [searchText, setSearchText] = useState("")
  const [messageApi, contextHolder] = message.useMessage()

  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [pointValues, setPointValues] = useState<Map<number, PointValue>>(new Map())

  const [isDiscoveryModalOpen, setIsDiscoveryModalOpen] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([])
  const [selectedDiscoveryRows, setSelectedDiscoveryRows] = useState<React.Key[]>([])

  // [NEW] Edit Polling State
  const [isEditPollingOpen, setIsEditPollingOpen] = useState(false)
  const [deviceToEdit, setDeviceToEdit] = useState<Device | null>(null)
  const [formEditPolling] = Form.useForm()

  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false)
  const [writingPoint, setWritingPoint] = useState<Point | null>(null)
  const [writeValue, setWriteValue] = useState<string | number>("")
  const [writePriority, setWritePriority] = useState<number>(8)
  const [isWriting, setIsWriting] = useState(false)

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isMonitoring, setIsMonitoring] = useState(false)

  useEffect(() => { AOS.refresh() }, [currentView, selectedDevice])

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await authFetch('/settings')).json(),
  })
  const globalPollingInterval = Math.max(Number(settings?.polling_interval) || 5000, 1000)

  const { data: devices, isLoading: isLoadingDevices, refetch: refetchDevices } = useQuery<Device[]>({
    queryKey: ["bacnet-devices"],
    queryFn: async () => {
      const res = await authFetch('/devices')
      const data = await res.json()
      return (Array.isArray(data) ? data : []).filter((d: any) => d.protocol !== 'MODBUS')
    },
    refetchInterval: 10000,
  })

  // [NEW] Auto-select device from navigation
  useEffect(() => {
    if (initialDeviceId && devices) {
      if (!selectedDevice) {
        const target = devices.find(d => d.id === initialDeviceId)
        if (target) {
          setSelectedDevice(target)
          setCurrentView('detail')
        } else if (!isLoadingDevices) {
          messageApi.error("Device not found")
          setCurrentView('dashboard')
        }
      }
    }
  }, [devices, initialDeviceId, isLoadingDevices])

  const { data: points, isLoading: isLoadingPoints, refetch: refetchPoints } = useQuery<Point[]>({
    queryKey: ["points", selectedDevice?.id],
    enabled: currentView === "detail" && !!selectedDevice,
    queryFn: async () => (await authFetch(`/points/${selectedDevice!.id}`)).json()
  })

  // Polling Logic
  useEffect(() => {
    if (currentView !== "detail" || !selectedDevice) { setIsMonitoring(false); return }
    setIsMonitoring(true)

    const effectiveInterval = selectedDevice.polling_interval
      ? Math.max(selectedDevice.polling_interval, 1000)
      : globalPollingInterval

    console.log(`⏱️ Polling: ${effectiveInterval}ms`)

    const fetchValues = async () => {
      try {
        const res = await authFetch('/monitor/read-device-points', {
          method: "POST", body: JSON.stringify({ deviceId: selectedDevice.id }),
        })
        const data = await res.json()
        if (data.success && data.values) {
          const newValues = new Map()
          data.values.forEach((v: PointValue) => newValues.set(v.pointId, v))
          setPointValues(newValues)
        }
      } catch (error) { console.error(error) }
    }
    fetchValues()
    const interval = setInterval(fetchValues, effectiveInterval)
    return () => { clearInterval(interval); setIsMonitoring(false) }
  }, [currentView, selectedDevice, globalPollingInterval])

  // Handlers
  const existingDeviceIds = useMemo(() => {
    if (!devices) return new Set<number>()
    return new Set(devices.map(d => d.device_instance_id).filter((id): id is number => id !== undefined))
  }, [devices])

  const handleMenuClick = (key: string) => { setCurrentView(key); if (key === 'dashboard') setSelectedDevice(null); }

  const handleScan = async () => {
    setIsDiscoveryModalOpen(true); setIsScanning(true); setDiscoveredDevices([]);
    try { const res = await authFetch('/devices/discover'); setDiscoveredDevices(await res.json()); }
    catch { messageApi.error("Scan Failed"); } finally { setIsScanning(false); }
  }

  const handleAddSelected = async () => {
    if (selectedDiscoveryRows.length === 0) return
    setIsAdding(true)
    try {
      const devicesToAdd = discoveredDevices
        .filter((d) => selectedDiscoveryRows.includes(d.deviceId))
        .map((d) => ({
          device_name: `Device-${d.deviceId}`, device_instance_id: d.deviceId, ip_address: d.address, network_number: 0, protocol: 'BACNET'
        }))
      await authFetch('/devices', { method: 'POST', body: JSON.stringify(devicesToAdd) })
      messageApi.success("Added devices"); setIsDiscoveryModalOpen(false); refetchDevices()
    } catch { messageApi.error("Error saving"); } finally { setIsAdding(false); }
  }

  // [NEW] Handler Update Device Configuration
  const handleUpdateDevice = async (values: any) => {
    if (!deviceToEdit) return
    try {
      const payload = {
        polling_interval: values.pollingInterval || null
      }

      await authFetch(`/devices/${deviceToEdit.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      })
      messageApi.success('Device configuration updated')
      setIsEditPollingOpen(false)
      setDeviceToEdit(null)
      refetchDevices()

      if (selectedDevice?.id === deviceToEdit.id) {
        setSelectedDevice(prev => prev ? { ...prev, ...payload } : null)
      }
    } catch { messageApi.error('Update failed') }
  }

  const handleSync = async () => { /* ... existing ... */
    if (!selectedDevice) return; setIsSyncing(true);
    try { await authFetch('/points/sync', { method: 'POST', body: JSON.stringify({ deviceId: selectedDevice.id }) }); messageApi.success("Synced points"); refetchPoints(); } catch { messageApi.error("Sync failed") } finally { setIsSyncing(false) }
  }
  const handleWrite = async () => { /* ... existing ... */
    if (!selectedDevice || !writingPoint) return; setIsWriting(true);
    try { await authFetch('/points/write', { method: "POST", body: JSON.stringify({ deviceId: selectedDevice.id, pointId: writingPoint.id, value: writingPoint.object_type.includes("ANALOG") ? Number(writeValue) : (writeValue === 'active' || writeValue === 1 ? 1 : 0), priority: writePriority }) }); messageApi.success("Command Sent"); setIsWriteModalOpen(false); setTimeout(refetchPoints, 1000) } catch { messageApi.error("Write Failed") } finally { setIsWriting(false) }
  }

  const renderDashboard = () => (
    <>
      <div style={{ marginBottom: 24 }} data-aos="fade-down">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}><Title level={3} style={{ margin: 0 }}>Device Manager</Title><Text type="secondary">Manage BACnet devices</Text></Col>
          <Col xs={24} md={12} style={{ textAlign: "right" }}>
            <Space>
              <Input prefix={<SearchOutlined />} placeholder="Search..." value={searchText} onChange={e => setSearchText(e.target.value)} style={{ width: 200 }} />
              <Button icon={<ReloadOutlined />} onClick={() => refetchDevices()}>Refresh</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleScan}>Discovery</Button>
            </Space>
          </Col>
        </Row>
      </div>
      <div data-aos="fade-up"><DeviceStatsCards total={devices?.length || 0} online={devices?.length || 0} offline={0} /></div>
      <div data-aos="fade-up" data-aos-delay="200">
        <Card>
          <DeviceTable
            devices={devices || []}
            loading={isLoadingDevices}
            defaultPollingInterval={globalPollingInterval} // [NEW] Pass default
            onViewDevice={(d) => { setSelectedDevice(d); setCurrentView("detail") }}
            searchText={searchText}
            onEditDevice={(d) => {
              setDeviceToEdit(d);
              formEditPolling.setFieldsValue({
                pollingInterval: d.polling_interval
              });
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
              <Button icon={<ArrowLeftOutlined />} type="link" onClick={() => { setSelectedDevice(null); setCurrentView('dashboard') }}>Back</Button>
              <Title level={4} style={{ margin: 0 }}>{selectedDevice?.device_name}</Title>
              <Space split={<Divider type="vertical" />}>
                <Text type="secondary"><WifiOutlined /> {selectedDevice?.ip_address}</Text>
                <Text type="secondary">ID: {selectedDevice?.device_instance_id}</Text>
                {isMonitoring && <Badge status="processing" text="Monitoring" />}
              </Space>
            </Col>
            <Col>
              <Space>
                <Button type="primary" icon={<SyncOutlined spin={isSyncing} />} onClick={handleSync}>Sync Points</Button>
                <Button icon={<ReloadOutlined />} onClick={() => refetchPoints()}>Refresh</Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </div>
      <div data-aos="fade-up"><PointStatsCards total={points?.length || 0} monitoring={points?.filter(p => p.is_monitor).length || 0} inputs={0} outputs={0} /></div>
      <div data-aos="fade-up" data-aos-delay="200">
        <Card>
          <PointTable points={points || []} pointValues={pointValues} loading={isLoadingPoints} onWritePoint={(p) => { setWritingPoint(p); setWriteValue(pointValues.get(p.id)?.value ?? ""); setIsWriteModalOpen(true) }} />
        </Card>
      </div>
    </>
  )

  // [NEW] Loading State Render
  if (currentView === 'loading') {
    return (
      <DashboardLayout title="BACnet System" headerIcon={<DatabaseOutlined />} themeColor="#1890ff" onBack={onBack} currentView="loading" onMenuClick={() => { }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          {/* Using a Card or simple div with Spin */}
          <Card style={{ width: 300, textAlign: 'center' }}>
            <Space direction="vertical">
              <Text>Loading Device...</Text>
              <SyncOutlined spin style={{ fontSize: 24, color: '#1890ff' }} />
            </Space>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="BACnet System" headerIcon={<DatabaseOutlined />} themeColor="#1890ff" onBack={onBack} currentView={currentView === 'detail' ? 'dashboard' : currentView} onMenuClick={handleMenuClick}>
      {contextHolder}
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'detail' && renderDetail()}
      {currentView === 'settings' && (
        <Card>
          <Tabs items={[
            { key: 'general', label: <span><GlobalOutlined /> General</span>, children: <GeneralSettings /> },
            { key: 'network', label: <span><ApiOutlined /> Network</span>, children: <NetworkSettings /> },
            { key: 'users', label: <span><UserOutlined /> Users</span>, children: <UserSettings /> },
            { key: 'database', label: <span><DatabaseOutlined /> Database</span>, children: <DatabaseSettings filterProtocol="BACNET" /> },
          ]} />
        </Card>
      )}
      {currentView === 'logs' && <LogsPage defaultProtocol="BACNET" />}

      <DiscoveryModal open={isDiscoveryModalOpen} loading={isScanning} adding={isAdding} devices={discoveredDevices} selectedRows={selectedDiscoveryRows} existingDeviceIds={existingDeviceIds} onClose={() => setIsDiscoveryModalOpen(false)} onAdd={handleAddSelected} onSelectionChange={setSelectedDiscoveryRows} />

      {/* [NEW] Edit Device Configuration Modal */}
      <Modal
        title="Edit Device Configuration"
        open={isEditPollingOpen}
        onCancel={() => setIsEditPollingOpen(false)}
        footer={null}
        width={400}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">Target Device: </Text>
          <Text strong>{deviceToEdit?.device_name}</Text>
        </div>
        <Form form={formEditPolling} layout="vertical" onFinish={handleUpdateDevice}>
          <Form.Item
            name="pollingInterval"
            label="Polling Interval (ms)"
            help={`Default: ${globalPollingInterval} ms`}
          >
            <InputNumber style={{ width: '100%' }} placeholder="Default" min={1000} step={500} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <Button onClick={() => setIsEditPollingOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Save Changes</Button>
          </div>
        </Form>
      </Modal>

      <WriteValueModal open={isWriteModalOpen} point={writingPoint} currentValue={pointValues.get(writingPoint?.id || 0)?.value} writeValue={writeValue} priority={writePriority} loading={isWriting} onClose={() => setIsWriteModalOpen(false)} onWrite={handleWrite} onValueChange={setWriteValue} onPriorityChange={setWritePriority} />
      <ProfileModal open={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </DashboardLayout>
  )
}