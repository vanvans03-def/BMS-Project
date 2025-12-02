/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Layout, Menu, Button, Input, Avatar, Space, Typography, Card,
  message, Badge, Row, Col, theme, Divider, Tabs, Dropdown
} from "antd"
import {
  AppstoreOutlined, SettingOutlined, FileTextOutlined,
  SearchOutlined, UserOutlined, ReloadOutlined, PlusOutlined,
  WifiOutlined, DatabaseOutlined, ArrowLeftOutlined, SyncOutlined,
  GlobalOutlined, ApiOutlined, LogoutOutlined, DownOutlined
} from "@ant-design/icons"
import { useAuth } from './contexts/AuthContext'
import { authFetch } from './utils/authFetch'

// Components
import { DeviceTable } from "./components/DeviceTable"
import { PointTable } from "./components/PointTable"
import { WriteValueModal } from "./components/WriteValueModal"
import { DiscoveryModal } from "./components/DiscoveryModal"
import { DeviceStatsCards, PointStatsCards } from "./components/StatsCards"
import { GeneralSettings, NetworkSettings, UserSettings, DatabaseSettings } from "./components/SettingsTabs"
import { LogsPage } from "./components/LogsPage"
import { ProfileModal } from "./components/ProfileModal"

const { Header, Content, Sider } = Layout
const { Title, Text } = Typography

// [1] เพิ่ม Interface สำหรับรับ Prop onBack
interface AppContentProps {
  onBack: () => void
}

interface Device {
  id: number
  device_name: string
  device_instance_id: number
  ip_address: string
  network_number?: number
  is_active?: boolean
}

interface Point {
  id: number
  device_id: number
  object_type: string
  object_instance: number
  point_name: string
  is_monitor: boolean
}

interface PointValue {
  pointId: number
  pointName: string
  objectType: string
  instance: number
  value: any
  status: string
  timestamp: string
}

interface SystemSettings {
  polling_interval?: number
  [key: string]: any
}

// [2] รับ Prop onBack เข้ามาใน Component
function AppContent({ onBack }: AppContentProps) {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [searchText, setSearchText] = useState("")
  const [messageApi, contextHolder] = message.useMessage()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  const [currentView, setCurrentView] = useState<"dashboard" | "detail" | "settings" | "logs">("dashboard")
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)

  // ... (State อื่นๆ คงเดิม) ...
  const [isDiscoveryModalOpen, setIsDiscoveryModalOpen] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([])
  const [selectedDiscoveryRows, setSelectedDiscoveryRows] = useState<React.Key[]>([])
  const [isAdding, setIsAdding] = useState(false)

  const [isSyncing, setIsSyncing] = useState(false)
  const [pointValues, setPointValues] = useState<Map<number, PointValue>>(new Map())
  const [isMonitoring, setIsMonitoring] = useState(false)

  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false)
  const [writingPoint, setWritingPoint] = useState<Point | null>(null)
  const [writeValue, setWriteValue] = useState<string | number>("")
  const [writePriority, setWritePriority] = useState<number>(8)
  const [isWriting, setIsWriting] = useState(false)

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  // ... (Queries: settings, devices, points เหมือนเดิม ไม่ต้องแก้) ...
  const { data: settings, refetch: refetchSettings } = useQuery<SystemSettings>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await authFetch('/settings')
      return await res.json()
    },
    staleTime: 0,
  })

  useEffect(() => {
    refetchSettings()
  }, [currentView, selectedDevice, refetchSettings])

  const pollingInterval = Math.max(Number(settings?.polling_interval) || 5000, 1000)

  const {
    data: devices,
    isLoading: isLoadingDevices,
    refetch: refetchDevices,
  } = useQuery<Device[]>({
    queryKey: ["devices"],
    queryFn: async () => {
      const res = await authFetch('/devices')
      const data = await res.json()
      return (Array.isArray(data) ? data : []) as Device[]
    },
    enabled: currentView === "dashboard",
    refetchInterval: 10000,
  })

  const {
    data: points,
    isLoading: isLoadingPoints,
    refetch: refetchPoints,
  } = useQuery<Point[]>({
    queryKey: ["points", selectedDevice?.id],
    queryFn: async () => {
      if (!selectedDevice) return []
      const res = await authFetch(`/points/${selectedDevice.id}`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : data.points || []
    },
    enabled: currentView === "detail" && !!selectedDevice,
  })

  // ... (Effect: Monitoring Loop เหมือนเดิม) ...
  useEffect(() => {
    if (currentView !== "detail" || !selectedDevice || !points || points.length === 0) {
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

        if (!res.ok) return
        const data = await res.json()

        if (data.success && data.values) {
          const newValues = new Map<number, PointValue>()
          data.values.forEach((v: PointValue) => {
            newValues.set(v.pointId, v)
          })
          setPointValues(newValues)
        }
      } catch (error) {
        console.error("Monitor error:", error)
      }
    }

    fetchValues()
    const interval = setInterval(fetchValues, pollingInterval)

    return () => {
      clearInterval(interval)
      setIsMonitoring(false)
    }
  }, [currentView, selectedDevice, points, pollingInterval])

  // ... (Logic เดิม: handleMenuClick, handleViewDevice, handleScan, handleAddSelected, etc.) ...
  
  const existingDeviceIds = useMemo(() => {
    return new Set(devices?.map((d) => d.device_instance_id) || [])
  }, [devices])

  const handleMenuClick = (key: string) => {
    if (key === "1") {
      setCurrentView("dashboard")
      setSelectedDevice(null)
    } else if (key === "2") {
      setCurrentView("settings")
      setSelectedDevice(null)
    } else if (key === "3") {
      setCurrentView("logs")
      setSelectedDevice(null)
    }
  }

  const handleViewDevice = (device: Device) => {
    setSelectedDevice(device)
    setCurrentView("detail")
  }

  const handleBackToDashboard = () => {
    setSelectedDevice(null)
    setCurrentView("dashboard")
    setPointValues(new Map())
  }

  const handleOpenWriteModal = (point: Point) => {
    setWritingPoint(point)
    const currentVal = pointValues.get(point.id)?.value
    setWriteValue(currentVal ?? "")
    setWritePriority(8)
    setIsWriteModalOpen(true)
  }

  const handleWriteValue = async () => {
    if (!selectedDevice || !writingPoint) return

    setIsWriting(true)
    try {
      let finalValue = writeValue

      if (writingPoint.object_type.includes("ANALOG")) {
        finalValue = Number(writeValue)
      } else if (writingPoint.object_type.includes("BINARY")) {
        finalValue = writeValue === "active" || writeValue === 1 || writeValue === "1" ? 1 : 0
      }

      const res = await authFetch('/points/write', {
        method: "POST",
        body: JSON.stringify({
          deviceId: selectedDevice.id,
          pointId: writingPoint.id,
          value: finalValue,
          priority: writePriority,
        }),
      })

      const data = await res.json()

      if (data.success) {
        messageApi.success("Command Sent Successfully!")
        setIsWriteModalOpen(false)
        setTimeout(() => refetchPoints(), 1000)
      } else {
        messageApi.error(`Write Failed: ${data.message}`)
      }
    } catch (error) {
      messageApi.error("Failed to send command")
    } finally {
      setIsWriting(false)
    }
  }

  const handleScan = async () => {
    setIsDiscoveryModalOpen(true)
    setIsScanning(true)
    setDiscoveredDevices([])
    setSelectedDiscoveryRows([])
    try {
      const res = await authFetch('/devices/discover')
      const data = await res.json()
      setDiscoveredDevices(Array.isArray(data) ? data : [])
    } catch (err) {
      messageApi.error("Scan Failed")
    } finally {
      setIsScanning(false)
    }
  }

  const handleAddSelected = async () => {
    if (selectedDiscoveryRows.length === 0) return
    setIsAdding(true)
    const devicesToAdd = discoveredDevices
      .filter((d) => selectedDiscoveryRows.includes(d.deviceId))
      .map((d) => ({
        device_name: `Device-${d.deviceId}`,
        device_instance_id: d.deviceId,
        ip_address: d.address,
        network_number: 0,
      }))

    try {
      const res = await authFetch('/devices', {
        method: 'POST',
        body: JSON.stringify(devicesToAdd)
      })
      const data = await res.json()
      // @ts-ignore
      messageApi.success(`Added ${data?.added ?? 0} devices`)
      setIsDiscoveryModalOpen(false)
      refetchDevices()
    } catch (err) {
      messageApi.error("Error saving to database")
    } finally {
      setIsAdding(false)
    }
  }

  const handleSyncPoints = async () => {
    if (!selectedDevice) return
    setIsSyncing(true)
    try {
      const res = await authFetch('/points/sync', {
        method: 'POST',
        body: JSON.stringify({ deviceId: selectedDevice.id })
      })
      const data = await res.json()

      // @ts-ignore
      if (data?.success) {
        // @ts-ignore
        messageApi.success(`Synced ${data.count} points!`)
        refetchPoints()
      } else {
        messageApi.warning("Sync completed but no points found")
      }
    } catch (err) {
      messageApi.error("Sync failed")
    } finally {
      setIsSyncing(false)
    }
  }

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: 'Profile',
        onClick: () => setIsProfileModalOpen(true)
      },
      {
        type: 'divider' as const,
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Logout',
        danger: true,
        onClick: logout
      }
    ]
  }

  // --- Render Sections (Dashboard, Detail, Settings) คงเดิม ---
  const renderDashboard = () => (
    <>
      <div style={{ marginBottom: 24 }} data-aos="fade-down">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={24} md={12} lg={12}>
            <Title level={3} style={{ margin: 0, marginBottom: 8 }}>
              <DatabaseOutlined /> Device Manager
            </Title>
            <Text type="secondary">Manage and monitor BACnet devices</Text>
          </Col>
          <Col xs={24} sm={24} md={12} lg={12} style={{ textAlign: "right" }}>
            <Space wrap>
              <Input
                placeholder="Search devices..."
                prefix={<SearchOutlined />}
                style={{ width: 200 }}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <Button icon={<ReloadOutlined />} onClick={() => refetchDevices()}>
                Refresh
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleScan}>
                Discovery
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <div data-aos="fade-up" data-aos-delay="100">
        <DeviceStatsCards total={devices?.length || 0} online={devices?.length || 0} offline={0} />
      </div>

      <div data-aos="fade-up" data-aos-delay="200">
        <Card>
          <DeviceTable devices={devices || []} loading={isLoadingDevices} onViewDevice={handleViewDevice} searchText={searchText} />
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
                  onClick={handleBackToDashboard}
                  type="link"
                  style={{ padding: 0, marginBottom: 8 }}
                >
                  Back to Device Manager
                </Button>
                <Title level={4} style={{ margin: 0 }}>
                  {selectedDevice?.device_name}
                </Title>
                <Space split={<Divider type="vertical" />} wrap>
                  <Text type="secondary">
                    <WifiOutlined /> {selectedDevice?.ip_address}
                  </Text>
                  <Text type="secondary">ID: {selectedDevice?.device_instance_id}</Text>
                  <Badge status="success" text="Online" />
                  {isMonitoring && (
                    <Badge 
                      status="processing" 
                      text={`Monitoring (${(pollingInterval/1000).toFixed(1)}s)`} 
                    />
                  )}
                </Space>
              </Space>
            </Col>
            <Col xs={24} md={12} style={{ textAlign: "right" }}>
              <Space wrap>
                <Button
                  type="primary"
                  icon={<SyncOutlined spin={isSyncing} />}
                  onClick={handleSyncPoints}
                  loading={isSyncing}
                >
                  Sync Points
                </Button>
                <Button icon={<ReloadOutlined />} onClick={() => refetchPoints()}>
                  Refresh
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </div>

      <div data-aos="fade-up" data-aos-delay="100">
        <PointStatsCards
          total={points?.length || 0}
          monitoring={points?.filter((p) => p.is_monitor).length || 0}
          inputs={points?.filter((p) => p.object_type.includes("INPUT")).length || 0}
          outputs={points?.filter((p) => p.object_type.includes("OUTPUT")).length || 0}
        />
      </div>

      <div data-aos="fade-up" data-aos-delay="200">
        <Card>
          <PointTable
            points={points || []}
            pointValues={pointValues}
            loading={isLoadingPoints}
            onWritePoint={handleOpenWriteModal}
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
        <Text type="secondary">Configure BACnet driver, users, and system preferences</Text>
      </div>

      <div data-aos="fade-up" data-aos-delay="100">
        <Card>
          <Tabs
            defaultActiveKey="general"
            items={[
              {
                key: "general",
                label: (
                  <span>
                    <GlobalOutlined /> General
                  </span>
                ),
                children: <GeneralSettings />,
              },
              {
                key: "network",
                label: (
                  <span>
                    <ApiOutlined /> Network & Driver
                  </span>
                ),
                children: <NetworkSettings />,
              },
              {
                key: "users",
                label: (
                  <span>
                    <UserOutlined /> Users
                  </span>
                ),
                children: <UserSettings />,
              },
              {
                key: "database",
                label: (
                  <span>
                    <DatabaseOutlined /> Database
                  </span>
                ),
                children: <DatabaseSettings />,
              },
            ]}
          />
        </Card>
      </div>
    </>
  )

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {contextHolder}

      {/* [3] Header + ปุ่ม Back */}
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          background: "#001529",
          position: "sticky",
          top: 0,
          zIndex: 1000,
        }}
      >
        {/* ส่วนปุ่ม Back: คลิกแล้วเรียก onBack() */}
        <Space style={{ cursor: 'pointer', marginRight: 16 }} onClick={onBack}>
            <ArrowLeftOutlined style={{ color: 'white', fontSize: 18 }} />
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 600 }}>Portal</Text>
        </Space>
        
        <Divider type="vertical" style={{ background: 'rgba(255,255,255,0.2)', margin: '0 16px' }} />

        <DatabaseOutlined style={{ fontSize: 24, marginRight: 12, color: "#1890ff" }} />
        <Title level={4} style={{ margin: 0, color: "white" }}>
          BACnet System
        </Title>
        <div style={{ flex: 1 }} />
        <Space>
          <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
            <Button type="text" style={{ color: 'white', height: 'auto', padding: '4px 12px' }}>
              <Space>
                <Avatar style={{ backgroundColor: "#1890ff" }} icon={<UserOutlined />} />
                <Text style={{ color: "white", display: window.innerWidth > 768 ? "inline" : "none" }}>
                  {user?.username || 'User'}
                </Text>
                <DownOutlined style={{ fontSize: 12 }} />
              </Space>
            </Button>
          </Dropdown>
        </Space>
      </Header>

      <Layout>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme="light"
          breakpoint="lg"
          collapsedWidth={window.innerWidth < 768 ? 0 : 80}
        >
          <Menu
            mode="inline"
            selectedKeys={[
                currentView === "settings" ? "2" : 
                currentView === "logs" ? "3" : "1"
            ]}
            onClick={({ key }) => handleMenuClick(key)}
            items={[
              { key: "1", icon: <AppstoreOutlined />, label: "Dashboard" },
              { key: "2", icon: <SettingOutlined />, label: "Settings" },
              { key: "3", icon: <FileTextOutlined />, label: "Logs" },
            ]}
          />
        </Sider>

        <Layout style={{ padding: "16px" }}>
          <Content
            style={{
              padding: 24,
              margin: 0,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              minHeight: "calc(100vh - 64px - 32px)",
            }}
          >
            {currentView === "dashboard" && renderDashboard()}
            {currentView === "detail" && renderDetail()}
            {currentView === "settings" && renderSettings()}
            {currentView === "logs" && <LogsPage />}

            <DiscoveryModal
              open={isDiscoveryModalOpen}
              loading={isScanning}
              adding={isAdding}
              devices={discoveredDevices}
              selectedRows={selectedDiscoveryRows}
              existingDeviceIds={existingDeviceIds}
              onClose={() => setIsDiscoveryModalOpen(false)}
              onAdd={handleAddSelected}
              onSelectionChange={setSelectedDiscoveryRows}
            />

            <WriteValueModal
              open={isWriteModalOpen}
              point={writingPoint}
              currentValue={pointValues.get(writingPoint?.id || 0)?.value}
              writeValue={writeValue}
              priority={writePriority}
              loading={isWriting}
              onClose={() => setIsWriteModalOpen(false)}
              onWrite={handleWriteValue}
              onValueChange={setWriteValue}
              onPriorityChange={setWritePriority}
            />
            <ProfileModal 
              open={isProfileModalOpen}
              onClose={() => setIsProfileModalOpen(false)}
            />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

export default AppContent