/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button, Input, Space, Typography, Card, message, Badge, Row, Col, Divider, Modal, Form, InputNumber } from "antd"
import {
  SearchOutlined, ReloadOutlined, PlusOutlined, DatabaseOutlined,
  WifiOutlined, ArrowLeftOutlined, SyncOutlined, SettingOutlined,
  FileTextOutlined,
  LineChartOutlined,
  CloudServerOutlined // [NEW]
} from "@ant-design/icons"
import AOS from 'aos'

import { authFetch } from '../../utils/authFetch'
import { DashboardLayout } from '../../components/layout/DashboardLayout'

import { DeviceTable } from "./DeviceTable"
import { PointTable } from "./PointTable"
import { DatabaseDropZone } from "./DatabaseDropZone" // [NEW]
import { DiscoveryModal } from "./DiscoveryModal"
import { DeviceStatsCards, PointStatsCards } from "../../components/StatsCards"
import { WriteValueModal } from "../../components/WriteValueModal"
import { LogsPage } from "../../components/LogsPage"
import { ProfileModal } from "../../components/ProfileModal"
import { DeviceConfigurationModal } from '../shared/DeviceConfigurationModal'
// import { PointConfigurationModal } from '../shared/PointConfigurationModal' // [TODO] Will be used for point config
import HistoryGraphPanel from "../central_logs/HistoryGraphPanel"
import HistoryLogsPanel from "../central_logs/HistoryLogsPanel"
import { ConfigurationModal } from "./ConfigurationModal"
import { BACnetGatewayManager } from "./BACnetGatewayManager"

import type { Device, Point, PointValue } from "../../types/common"

const { Title, Text } = Typography

interface BACnetAppProps {
  onBack: () => void;
  initialDeviceId?: number | null;
  initialView?: string;
  onNavigate?: (key: string) => void;
}

export default function BACnetApp({ onBack, initialDeviceId, initialView, onNavigate }: BACnetAppProps) {
  // [MODIFIED] Start in 'loading' state if we have a target device
  const [currentView, setCurrentView] = useState<string>(initialDeviceId ? "loading" : (initialView || "dashboard"))
  const [searchText, setSearchText] = useState("")
  const [messageApi, contextHolder] = message.useMessage()

  const [selectedGateway, setSelectedGateway] = useState<any>(null)
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

  // [NEW] Device & Point Configuration Modals
  const [deviceConfigModalOpen, setDeviceConfigModalOpen] = useState(false)
  const [selectedDeviceForConfig, setSelectedDeviceForConfig] = useState<number | null>(null)
  const [selectedDeviceForConfigName, setSelectedDeviceForConfigName] = useState('')
  // [TODO] Point config modal states - will use when implementing point configuration
  // const [pointConfigModalOpen, setPointConfigModalOpen] = useState(false)
  // const [selectedPointForConfig, setSelectedPointForConfig] = useState<number | null>(null)
  // const [selectedPointForConfig, setSelectedPointForConfig] = useState<number | null>(null)

  // [NEW] View Mode for Points (Table vs Manager)
  const [pointViewMode, setPointViewMode] = useState<'table' | 'manager'>('table')
  const [stagedPoints, setStagedPoints] = useState<Point[]>([]) // [NEW]

  useEffect(() => { AOS.refresh() }, [currentView, selectedGateway, selectedDevice])

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

  // [REF] Navigation Logic Update
  useEffect(() => {
    if (initialDeviceId && devices) {
      if (!selectedDevice) {
        const target = devices.find(d => d.id === initialDeviceId)
        if (target) {
          setSelectedDevice(target)
          setCurrentView('detail')
          // [FIX] Ensure parent gateway is selected if possible (for context)
          if ((target as any).network_config_id) {
            const netId = (target as any).network_config_id
            // Shallow object for immediate context
            setSelectedGateway({ id: netId, name: 'Gateway', enable: true })
            // Fetch real
            authFetch(`/config/networks/${netId}`).then(r => r.json()).then(g => setSelectedGateway(g)).catch(() => { })
          }
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

  const handleMenuClick = (key: string) => {
    setCurrentView(key);
    if (key === 'dashboard') { setSelectedGateway(null); setSelectedDevice(null); }
    if (key === 'gateway') { setSelectedDevice(null); }
  }

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
          device_name: `Device-${d.deviceId}`,
          device_instance_id: d.deviceId,
          ip_address: d.address,
          network_number: 0,
          protocol: 'BACNET',
          // [FIX] Link to selected gateway
          network_config_id: selectedGateway ? selectedGateway.id : null
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

  // [NEW] Handler: Add Points to Database (Hierarchy)
  const handleAddToDatabase = async (pointIds: React.Key[]) => {
    if (!selectedDevice) return
    try {
      const res = await authFetch('/points/add-to-hierarchy', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: selectedDevice.id,
          pointIds: pointIds
        })
      })
      const json = await res.json()
      if (json.success) {
        messageApi.success(json.message)
        refetchPoints() // Refresh table to show "Added" status
      } else {
        messageApi.error('Failed to add points')
      }
    } catch (err) {
      messageApi.error('Error adding points')
    }
  }

  // [NEW] Handler: Toggle History
  const handleToggleHistory = async (point: Point) => {
    try {
      const newValue = !point.is_history_enabled
      const res = await authFetch('/points/history', {
        method: 'POST',
        body: JSON.stringify({
          pointId: point.id,
          enabled: newValue
        })
      })
      const json = await res.json()
      if (json.success) {
        messageApi.success(`History ${newValue ? 'Enabled' : 'Disabled'}`)
        refetchPoints()
      } else {
        messageApi.error('Failed to update history')
      }
    } catch (err) {
      messageApi.error('Error updating history')
    }
  }

  // RENDER: Dashboard (Root - Gateway Manager)
  const renderDashboard = () => (
    <Card title="BACnet Gateway Manager" data-aos="fade-up">
      <BACnetGatewayManager
        onSelectGateway={(gateway) => {
          setSelectedGateway(gateway);
          setCurrentView('gateway'); // [FIX] Go to gateway view
        }}
      />
    </Card>
  )

  // RENDER: Gateway (Device List)
  const renderGateway = () => (
    <>
      <div style={{ marginBottom: 24 }} data-aos="fade-down">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Title level={3} style={{ margin: 0 }}>
              {(selectedGateway as any)?.name || 'Gateway'} - Devices
            </Title>
            <Text type="secondary">Manage devices on this gateway</Text>
          </Col>
          <Col xs={24} md={12} style={{ textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  setSelectedGateway(null);
                  setCurrentView('dashboard');
                }}
              >
                Back to Gateways
              </Button>
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
            devices={(devices || []).filter(d =>
              !selectedGateway || (d as any).network_config_id === selectedGateway.id
            )}
            loading={isLoadingDevices}
            defaultPollingInterval={globalPollingInterval}
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
              setSelectedDeviceForConfig(d.id);
              setSelectedDeviceForConfigName(d.device_name);
              setDeviceConfigModalOpen(true);
            }}
          />
        </Card>
      </div>

      <DeviceConfigurationModal
        open={deviceConfigModalOpen}
        onClose={() => {
          setDeviceConfigModalOpen(false);
          setSelectedDeviceForConfig(null);
          setSelectedDeviceForConfigName('');
        }}
        onSave={() => {
          messageApi.success('Device configuration saved');
          setDeviceConfigModalOpen(false);
          setSelectedDeviceForConfig(null);
          setSelectedDeviceForConfigName('');
          refetchDevices();
        }}
        deviceId={selectedDeviceForConfig}
        deviceName={selectedDeviceForConfigName}
        protocol="BACNET"
      />
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
                <Button
                  icon={pointViewMode === 'table' ? <CloudServerOutlined /> : <FileTextOutlined />}
                  onClick={() => setPointViewMode(prev => prev === 'table' ? 'manager' : 'table')}
                >
                  {pointViewMode === 'table' ? 'Manage Database' : 'View Table'}
                </Button>
                <Button icon={<ReloadOutlined />} onClick={() => refetchPoints()}>Refresh</Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </div>
      <div data-aos="fade-up"><PointStatsCards total={points?.length || 0} monitoring={points?.filter(p => p.is_monitor).length || 0} inputs={0} outputs={0} /></div>
      <div data-aos="fade-up" data-aos-delay="200">
        <Card>
          {/* Always show PointTable, but enable DnD in 'manager' mode */}
          <PointTable
            points={points || []}
            pointValues={pointValues}
            loading={isLoadingPoints}
            onWritePoint={(p) => { setWritingPoint(p); setWriteValue(pointValues.get(p.id)?.value ?? ""); setIsWriteModalOpen(true) }}
            onViewHistory={(p) => setHistoryPoint(p)}
            onConfigPoint={(p) => {
              setConfigModal({
                open: true,
                type: 'POINT',
                targetId: p.id,
                initialConfig: (p as any).config || {},
                title: `Point Config: ${p.point_name}`
              })
            }}
            onAddToDatabase={handleAddToDatabase}
            onToggleHistory={handleToggleHistory}
            // [NEW] DnD Props
            dragEnabled={pointViewMode === 'manager'}
            onDragStart={(e, point) => {
              e.dataTransfer.setData('pointId', String(point.id))
            }}
            // [NEW] Staged Selection Sync
            selectedPointIds={stagedPoints.map(p => p.id)}
            onSelectionChange={(selectedIds) => {
              // Logic: Merge current staged points (excluding current device) + new selected points
              setStagedPoints(prev => {
                const currentDeviceIds = new Set((points || []).map(p => p.id))
                const otherDevicePoints = prev.filter(p => !currentDeviceIds.has(p.id))
                const newCurrentPoints = (points || []).filter(p => selectedIds.includes(p.id))
                return [...otherDevicePoints, ...newCurrentPoints]
              })
            }}
          />
        </Card>
      </div>

      {/* [NEW] Fixed Drop Zone at Bottom */}
      <DatabaseDropZone
        visible={pointViewMode === 'manager'}
        stagedPoints={stagedPoints}
        loading={isLoadingPoints}
        onDropPoint={(id) => {
          const point = points?.find(p => p.id === id)
          if (point && !stagedPoints.find(sp => sp.id === id)) {
            setStagedPoints(prev => [...prev, point])
          }
        }}
        onRemovePoint={(id) => {
          setStagedPoints(prev => prev.filter(p => p.id !== id))
        }}
        onSave={async () => {
          if (stagedPoints.length > 0) {
            await handleAddToDatabase(stagedPoints.map(p => p.id))
            setStagedPoints([])
            setPointViewMode('table') // Optional: Auto-close or stay open
          }
        }}
        onCancel={() => {
          setPointViewMode('table')
          setStagedPoints([])
        }}
      />
    </>
  )

  // Dynamic Menu
  const menuItems = useMemo(() => {
    // 1. Detail View: Back to Gateway
    if (selectedDevice && currentView === 'detail') {
      return [
        { key: "gateway", icon: <ArrowLeftOutlined />, label: "Back to Devices" },
        // Can add related point views here if needed
      ]
    }
    // 2. Gateway View (Device List): Back to Dashboard
    if (selectedGateway && currentView === "gateway") {
      return [
        { key: "dashboard", icon: <ArrowLeftOutlined />, label: "Back to Gateways" },
      ]
    }
    // 3. Root View
    return [
      { key: "dashboard", icon: <DatabaseOutlined />, label: "Dashboard" },
      { key: "history-graph", icon: <LineChartOutlined />, label: "History Graph" },
      { key: "history-logs", icon: <FileTextOutlined />, label: "History Logs" },
      { key: "logs", icon: <DatabaseOutlined />, label: "Audit Logs" },
    ]
  }, [selectedDevice, selectedGateway, currentView])

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

  // [FIX] Navigation Logic
  const handleInternalBack = () => {
    // 1. Points View -> Device List (Detail -> Dashboard with selectedGateway)
    if (currentView === 'detail' || currentView === 'points') {
      setSelectedDevice(null)
      setCurrentView('gateway') // Go back to device list
      return
    }

    // 2. Device List (Gateway View) -> Gateway List
    if (currentView === 'gateway') {
      setSelectedGateway(null)
      setCurrentView('dashboard') // Go back to root
      return
    }

    // 3. Fallback to parent onBack (Exit App)
    onBack && onBack()
  }

  return (
    <DashboardLayout
      title="BACnet Protocol"
      headerIcon={<DatabaseOutlined />}
      themeColor="#1890ff"
      // Use onBack only for top-level pages basically, OR if we rely on internal back
      // Actually, if we use handleInternalBack, we can wire it up for detail/gateway views too.
      // But typically DashboardLayout's onBack implies "Exit App" (Portal home).
      // We only want that on Dashboard/Logs/Settings.
      // Sub-views should behave like they are INSIDE the app, managed by menu/actions, 
      // UNLESS the user explicitly wants a "Back" in the header to go up.
      // ModbusApp shows NO back button in header for sub-views, relying on Sidebar/Menu "Back".
      // Let's mimic that.
      onBack={
        ['dashboard', 'settings', 'history-graph', 'history-logs', 'logs'].includes(currentView)
          ? onBack
          : undefined
      }
      currentView={currentView === 'points' ? 'points' : currentView}
      onMenuClick={handleMenuClick}
      menuItems={menuItems as any}
      headerActions={null}
      onNavigate={onNavigate as any}
    >
      {contextHolder}

      {/* Level 1 Views */}
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'gateway' && renderGateway()}
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
        <Card title="BACnet Gateway Management">
          <BACnetGatewayManager />
        </Card>
      )}

      {/* ... Modals ... */}
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

      <Modal title={null} open={historyPoint !== null} onCancel={() => setHistoryPoint(null)} footer={null} width={1000} styles={{ body: { padding: 0 } }}>
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