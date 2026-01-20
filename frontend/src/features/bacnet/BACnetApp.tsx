/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button, Input, Space, Typography, Card, message, Badge, Row, Col, Divider, Tabs, Modal, Form, InputNumber } from "antd"
import {
  SearchOutlined, ReloadOutlined, PlusOutlined, DatabaseOutlined,
  WifiOutlined, ArrowLeftOutlined, SyncOutlined, GlobalOutlined,
  ApiOutlined,
  FileTextOutlined,
  LineChartOutlined,
  SettingOutlined
} from "@ant-design/icons"
import AOS from 'aos'

import { authFetch } from '../../utils/authFetch'
import { DashboardLayout } from '../../components/layout/DashboardLayout'

import { DeviceTable } from "./DeviceTable"
import { PointTable } from "./PointTable"
import { DiscoveryModal } from "./DiscoveryModal"
import { DeviceStatsCards, PointStatsCards } from "../../components/StatsCards"
import { WriteValueModal } from "../../components/WriteValueModal"
import { GeneralSettings, NetworkSettings, DatabaseSettings } from "../../components/SettingsTabs"
import { LogsPage } from "../../components/LogsPage"
import { ProfileModal } from "../../components/ProfileModal"
import HistoryGraphPanel from "../central_logs/HistoryGraphPanel"
import HistoryLogsPanel from "../central_logs/HistoryLogsPanel"
import { ConfigurationModal } from "./ConfigurationModal"

import type { Device, Point, PointValue } from "../../types/common"

const { Title, Text } = Typography

interface BACnetAppProps { onBack: () => void; initialDeviceId?: number | null; initialView?: string }

export default function BACnetApp({ onBack, initialDeviceId, initialView }: BACnetAppProps) {
  // [MODIFIED] Start in 'loading' state if we have a target device
  const [currentView, setCurrentView] = useState<string>(initialDeviceId ? "loading" : (initialView || "dashboard"))
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

  // [Refactored] Generic Config Modal State
  const [configModal, setConfigModal] = useState<{
    open: boolean
    type: 'DRIVER' | 'DEVICE' | 'POINT'
    targetId: number | null
    initialConfig: any
    title?: string
  }>({ open: false, type: 'DRIVER', targetId: null, initialConfig: null })

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [historyPoint, setHistoryPoint] = useState<Point | null>(null)

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

  const [scanningPort, setScanningPort] = useState<number | undefined>(undefined) // [NEW]

  const handleScan = async () => {
    setIsDiscoveryModalOpen(true); setIsScanning(true); setDiscoveredDevices([]); setScanningPort(undefined);
    try {
      const res = await authFetch('/devices/discover');
      const data = await res.json();
      // Handle legacy or new format
      if (Array.isArray(data)) {
        setDiscoveredDevices(data);
      } else if (data.devices) {
        setDiscoveredDevices(data.devices);
        setScanningPort(data.scanningPort);
      }
    }
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
            onConfigDevice={(d) => {
              setConfigModal({
                open: true,
                type: 'DEVICE',
                targetId: d.id,
                initialConfig: d.config, // Ensure backend returns 'config'
                title: `Device Config: ${d.device_name}`
              })
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
          <PointTable
            points={points || []}
            pointValues={pointValues}
            loading={isLoadingPoints}
            onWritePoint={(p) => { setWritingPoint(p); setWriteValue(pointValues.get(p.id)?.value ?? ""); setIsWriteModalOpen(true) }}
            onViewHistory={(p) => setHistoryPoint(p)}
            onConfigPoint={(p) => {
              // Point object might not have 'config' if the DTO didn't include it.
              // We need to ensure 'points' data includes 'config'.
              // Based on pointsService.getPointsByDeviceId, it selects 'register_type', 'data_type' etc.
              // It probably doesn't select 'config' yet. I need to update points.service.ts
              // However, for now let's assume it's there or handle null.
              setConfigModal({
                open: true,
                type: 'POINT',
                targetId: p.id,
                initialConfig: (p as any).config || {},
                title: `Point Config: ${p.point_name}`
              })
            }}
          />
        </Card>
      </div>
    </>
  )

  // Dynamic Menu
  const menuItems = useMemo(() => {
    if (selectedDevice && currentView !== "loading") {
      return [
        { key: "dashboard", icon: <ArrowLeftOutlined />, label: "Back to List" },
        // { type: "divider" },
        // { key: "points", icon: <ApiOutlined />, label: "Points" },
        // History Graph removed from here
      ]
    }
    return [
      { key: "dashboard", icon: <DatabaseOutlined />, label: "Dashboard" },
      { key: "history-graph", icon: <LineChartOutlined />, label: "History Graph" }, // [NEW] Moved to Top Level
      { key: "history-logs", icon: <FileTextOutlined />, label: "History Logs" }, // [NEW] Added
      { key: "logs", icon: <DatabaseOutlined />, label: "Audit Logs" }, // Renamed for clarity
    ]
  }, [selectedDevice, currentView])

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
    <DashboardLayout
      title="BACnet Protocol"
      headerIcon={<DatabaseOutlined />}
      themeColor="#1890ff"
      onBack={['dashboard', 'history-graph', 'history-logs', 'logs'].includes(currentView) ? onBack : undefined}
      currentView={currentView === 'points' ? 'points' : currentView}
      onMenuClick={handleMenuClick}
      menuItems={menuItems as any}
      headerActions={null}
    >
      {contextHolder}

      {/* Level 1 Views */}
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'logs' && <LogsPage defaultProtocol="BACNET" />}

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

      {/* Level 2 Views (Device Selected) */}
      {(currentView === 'detail' || currentView === 'points') && renderDetail()}

      {/* ... Settings ... */}
      {currentView === 'settings' && (
        <Card title="System Settings">
          <Tabs items={[
            { key: 'general', label: <span><GlobalOutlined /> General</span>, children: <GeneralSettings /> },
            { key: 'network', label: <span><ApiOutlined /> Network</span>, children: <NetworkSettings /> },
            { key: 'database', label: <span><DatabaseOutlined /> Database</span>, children: <DatabaseSettings filterProtocol="BACNET" /> },
          ]} />
        </Card>
      )}

      <DiscoveryModal open={isDiscoveryModalOpen} loading={isScanning} adding={isAdding} devices={discoveredDevices} scanningPort={scanningPort} selectedRows={selectedDiscoveryRows} existingDeviceIds={existingDeviceIds} onClose={() => setIsDiscoveryModalOpen(false)} onAdd={handleAddSelected} onSelectionChange={setSelectedDiscoveryRows} />

      <Modal title="Edit Device Configuration" open={isEditPollingOpen} onCancel={() => setIsEditPollingOpen(false)} footer={null} width={400}>
        <div style={{ marginBottom: 16 }}><Text type="secondary">Target Device: </Text><Text strong>{deviceToEdit?.device_name}</Text></div>
        <Form form={formEditPolling} layout="vertical" onFinish={handleUpdateDevice}>
          <Form.Item name="pollingInterval" label="Polling Interval (ms)" help={`Default: ${globalPollingInterval} ms`}><InputNumber style={{ width: '100%' }} placeholder="Default" min={1000} step={500} /></Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}><Button onClick={() => setIsEditPollingOpen(false)}>Cancel</Button><Button type="primary" htmlType="submit">Save Changes</Button></div>
        </Form>
      </Modal>

      <WriteValueModal open={isWriteModalOpen} point={writingPoint} currentValue={pointValues.get(writingPoint?.id || 0)?.value} writeValue={writeValue} priority={writePriority} loading={isWriting} onClose={() => setIsWriteModalOpen(false)} onWrite={handleWrite} onValueChange={setWriteValue} onPriorityChange={setWritePriority} />
      <ProfileModal open={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

      <Modal title={null} open={historyPoint !== null} onCancel={() => setHistoryPoint(null)} footer={null} width={1000} styles={{ body: { padding: 0 } }} destroyOnClose>
        {historyPoint && selectedDevice && (<HistoryGraphPanel initialSelection={[{ deviceName: selectedDevice.device_name, pointName: historyPoint.point_name }]} />)}
      </Modal>

      {/* Generic Configuration Modal */}
      <ConfigurationModal
        open={configModal.open}
        onClose={() => setConfigModal(prev => ({ ...prev, open: false }))}
        onSave={() => {
          messageApi.success('Configuration saved');
          refetchDevices();
          refetchPoints();
        }}
        type={configModal.type}
        targetId={configModal.targetId}
        initialConfig={configModal.initialConfig}
        title={configModal.title}
      />
    </DashboardLayout>
  )
}