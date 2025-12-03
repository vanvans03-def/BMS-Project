/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button, Input, Space, Typography, Card, message, Badge, Row, Col, Divider, Tabs } from "antd"
import {
  SearchOutlined, ReloadOutlined, PlusOutlined, DatabaseOutlined, 
  WifiOutlined, ArrowLeftOutlined, SyncOutlined, GlobalOutlined, 
  ApiOutlined, UserOutlined
} from "@ant-design/icons"
import AOS from 'aos'

import { authFetch } from '../../utils/authFetch'
import { DashboardLayout } from '../../components/layout/DashboardLayout'

// Components
import { DeviceTable } from "./DeviceTable"
import { PointTable } from "./PointTable"
import { DiscoveryModal } from "./DiscoveryModal"
import { DeviceStatsCards, PointStatsCards } from "../../components/StatsCards"
import { WriteValueModal } from "../../components/WriteValueModal"
import { GeneralSettings, NetworkSettings, UserSettings, DatabaseSettings } from "../../components/SettingsTabs"
import { LogsPage } from "../../components/LogsPage"
import { ProfileModal } from "../../components/ProfileModal"

// Types
import type { Device, Point, PointValue } from "../../types/common"

const { Title, Text } = Typography

interface BACnetAppProps {
  onBack: () => void
}

export default function BACnetApp({ onBack }: BACnetAppProps) {
  const [currentView, setCurrentView] = useState<string>("dashboard")
  const [searchText, setSearchText] = useState("")
  const [messageApi, contextHolder] = message.useMessage()
  
  // Data States
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [pointValues, setPointValues] = useState<Map<number, PointValue>>(new Map())
  
  // Modal States
  const [isDiscoveryModalOpen, setIsDiscoveryModalOpen] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([])
  const [selectedDiscoveryRows, setSelectedDiscoveryRows] = useState<React.Key[]>([])
  
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false)
  const [writingPoint, setWritingPoint] = useState<Point | null>(null)
  const [writeValue, setWriteValue] = useState<string | number>("")
  const [writePriority, setWritePriority] = useState<number>(8)
  const [isWriting, setIsWriting] = useState(false)
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isMonitoring, setIsMonitoring] = useState(false)

  useEffect(() => { AOS.refresh() }, [currentView, selectedDevice])

  // Queries
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await authFetch('/settings')).json(),
  })
  const pollingInterval = Math.max(Number(settings?.polling_interval) || 5000, 1000)

  const { data: devices, isLoading: isLoadingDevices, refetch: refetchDevices } = useQuery<Device[]>({
    queryKey: ["bacnet-devices"],
    queryFn: async () => {
      const res = await authFetch('/devices')
      const data = await res.json()
      return (Array.isArray(data) ? data : []).filter((d: any) => d.protocol !== 'MODBUS')
    },
    refetchInterval: 10000,
  })

  const { data: points, isLoading: isLoadingPoints, refetch: refetchPoints } = useQuery<Point[]>({
    queryKey: ["points", selectedDevice?.id],
    enabled: currentView === "detail" && !!selectedDevice,
    queryFn: async () => {
        const res = await authFetch(`/points/${selectedDevice!.id}`)
        const data = await res.json()
        return Array.isArray(data) ? data : data.points || []
    },
  })

  // Polling Logic
  useEffect(() => {
    if (currentView !== "detail" || !selectedDevice) {
      setIsMonitoring(false)
      return
    }
    setIsMonitoring(true)
    const fetchValues = async () => {
      try {
        const res = await authFetch('/monitor/read-device-points', {
          method: "POST",
          body: JSON.stringify({ deviceId: selectedDevice.id }),
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
    const interval = setInterval(fetchValues, pollingInterval)
    return () => { clearInterval(interval); setIsMonitoring(false) }
  }, [currentView, selectedDevice, pollingInterval])

  // Handlers
  // [UPDATED] แก้ไขตรงนี้: กรอง undefined ออกเพื่อให้ได้ Set<number>
  const existingDeviceIds = useMemo(() => {
    if (!devices) return new Set<number>()
    return new Set(
      devices
        .map(d => d.device_instance_id)
        .filter((id): id is number => id !== undefined)
    )
  }, [devices])

  const handleMenuClick = (key: string) => {
    setCurrentView(key)
    if (key === 'dashboard') setSelectedDevice(null)
  }

  const handleScan = async () => {
    setIsDiscoveryModalOpen(true); setIsScanning(true); setDiscoveredDevices([]);
    try {
      const res = await authFetch('/devices/discover')
      setDiscoveredDevices(await res.json())
    } catch { messageApi.error("Scan Failed") }
    finally { setIsScanning(false) }
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
          protocol: 'BACNET'
        }))
      await authFetch('/devices', { method: 'POST', body: JSON.stringify(devicesToAdd) })
      messageApi.success("Added devices"); setIsDiscoveryModalOpen(false); refetchDevices()
    } catch { messageApi.error("Error saving") }
    finally { setIsAdding(false) }
  }

  const handleSync = async () => {
    if(!selectedDevice) return
    setIsSyncing(true)
    try {
        await authFetch('/points/sync', { method: 'POST', body: JSON.stringify({ deviceId: selectedDevice.id })})
        messageApi.success("Synced points"); refetchPoints()
    } catch { messageApi.error("Sync failed") }
    finally { setIsSyncing(false) }
  }

  const handleWrite = async () => {
    if (!selectedDevice || !writingPoint) return
    setIsWriting(true)
    try {
        await authFetch('/points/write', {
            method: "POST",
            body: JSON.stringify({
                deviceId: selectedDevice.id, pointId: writingPoint.id,
                value: writingPoint.object_type.includes("ANALOG") ? Number(writeValue) : (writeValue === 'active' || writeValue === 1 ? 1 : 0),
                priority: writePriority
            })
        })
        messageApi.success("Command Sent"); setIsWriteModalOpen(false); setTimeout(refetchPoints, 1000)
    } catch { messageApi.error("Write Failed") }
    finally { setIsWriting(false) }
  }

  // Renderers
  const renderDashboard = () => (
    <>
      <div style={{ marginBottom: 24 }} data-aos="fade-down">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Title level={3} style={{ margin: 0 }}>Device Manager</Title>
            <Text type="secondary">Manage BACnet devices</Text>
          </Col>
          <Col xs={24} md={12} style={{ textAlign: "right" }}>
            <Space>
              <Input prefix={<SearchOutlined />} placeholder="Search..." value={searchText} onChange={e => setSearchText(e.target.value)} style={{ width: 200 }} />
              <Button icon={<ReloadOutlined />} onClick={() => refetchDevices()}>Refresh</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleScan}>Discovery</Button>
            </Space>
          </Col>
        </Row>
      </div>
      <div data-aos="fade-up"><DeviceStatsCards total={devices?.length||0} online={devices?.length||0} offline={0} /></div>
      <div data-aos="fade-up" data-aos-delay="200">
        <Card>
            <DeviceTable devices={devices || []} loading={isLoadingDevices} onViewDevice={(d) => { setSelectedDevice(d); setCurrentView("detail") }} searchText={searchText} />
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
        <div data-aos="fade-up">
            <PointStatsCards total={points?.length||0} monitoring={points?.filter(p=>p.is_monitor).length||0} inputs={0} outputs={0} />
        </div>
        <div data-aos="fade-up" data-aos-delay="200">
            <Card>
                <PointTable points={points||[]} pointValues={pointValues} loading={isLoadingPoints} onWritePoint={(p) => { setWritingPoint(p); setWriteValue(pointValues.get(p.id)?.value ?? ""); setIsWriteModalOpen(true) }} />
            </Card>
        </div>
    </>
  )

  return (
    <DashboardLayout
        title="BACnet System"
        headerIcon={<DatabaseOutlined />}
        themeColor="#1890ff"
        onBack={onBack}
        currentView={currentView === 'detail' ? 'dashboard' : currentView}
        onMenuClick={handleMenuClick}
    >
        {contextHolder}
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'detail' && renderDetail()}
        {currentView === 'settings' && (
            <Card>
                <Tabs items={[
                    { key: 'general', label: <span><GlobalOutlined /> General</span>, children: <GeneralSettings /> },
                    { key: 'network', label: <span><ApiOutlined /> Network</span>, children: <NetworkSettings /> },
                    { key: 'users', label: <span><UserOutlined /> Users</span>, children: <UserSettings /> },
                    { key: 'database', label: <span><DatabaseOutlined /> Database</span>, children: <DatabaseSettings /> },
                ]} />
            </Card>
        )}
        {currentView === 'logs' && <LogsPage defaultProtocol="BACNET" />}

        <DiscoveryModal open={isDiscoveryModalOpen} loading={isScanning} adding={isAdding} devices={discoveredDevices} selectedRows={selectedDiscoveryRows} existingDeviceIds={existingDeviceIds} onClose={() => setIsDiscoveryModalOpen(false)} onAdd={handleAddSelected} onSelectionChange={setSelectedDiscoveryRows} />
        <WriteValueModal open={isWriteModalOpen} point={writingPoint} currentValue={pointValues.get(writingPoint?.id||0)?.value} writeValue={writeValue} priority={writePriority} loading={isWriting} onClose={() => setIsWriteModalOpen(false)} onWrite={handleWrite} onValueChange={setWriteValue} onPriorityChange={setWritePriority} />
        <ProfileModal open={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </DashboardLayout>
  )
}