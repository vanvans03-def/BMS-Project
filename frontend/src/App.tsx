import { useEffect, useState } from 'react'
import { Spin, Layout } from 'antd'
import AOS from 'aos'
import 'aos/dist/aos.css'
import './app/animations.css'

import { useAuth } from './contexts/AuthContext'
import { LoginPage } from './components/LoginPage'

// Features
import { PortalPage } from './features/portal/PortalPage'
import BACnetApp from './features/bacnet/BACnetApp'
import ModbusApp from './features/modbus/ModbusApp'
import CentralLogsApp from './features/central_logs/CentralLogsApp'
import GlobalSettingsApp from './features/settings/GlobalSettingsApp'

const { Content } = Layout

function App() {
  const { isAuthenticated, isLoading } = useAuth()

  // เพิ่ม state 'LOGS', 'HIERARCHY'
  const [currentSystem, setCurrentSystem] = useState<'BACNET' | 'MODBUS' | 'LOGS' | 'HIERARCHY' | 'GLOBAL_SETTINGS' | null>(null)

  // State for Deep Linking
  const [targetDeviceId, setTargetDeviceId] = useState<number | null>(null)
  const [targetView, setTargetView] = useState<string | undefined>(undefined)

  const handleNavigate = (system: 'BACNET' | 'MODBUS', deviceId: number) => {
    setTargetDeviceId(deviceId)
    setCurrentSystem(system)
  }

  // Update logic to accept view
  const handleSystemSelect = (system: 'BACNET' | 'MODBUS' | 'LOGS' | 'HIERARCHY' | 'GLOBAL_SETTINGS', view?: string) => {
    setCurrentSystem(system)
    setTargetDeviceId(null)
    if (view) setTargetView(view)
    else setTargetView(undefined)
  }

  useEffect(() => {
    AOS.init({ duration: 600, easing: 'ease-out-cubic', once: false, offset: 50 })
  }, [])

  if (isLoading) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          <Spin size="large" />
        </Content>
      </Layout>
    )
  }

  // Not Logged In
  if (!isAuthenticated) return <LoginPage />

  // Routing Logic
  if (currentSystem === 'BACNET') {
    return <BACnetApp onBack={() => setCurrentSystem(null)} initialDeviceId={targetDeviceId} initialView={targetView} />
  }

  if (currentSystem === 'MODBUS') {
    return <ModbusApp onBack={() => setCurrentSystem(null)} initialDeviceId={targetDeviceId} initialView={targetView} />
  }

  if (currentSystem === 'LOGS') {
    return <CentralLogsApp onBack={() => setCurrentSystem(null)} />
  }

  if (currentSystem === 'HIERARCHY') {
    // Legacy support or direct link
    return <GlobalSettingsApp onBack={() => setCurrentSystem(null)} />
  }

  if (currentSystem === 'GLOBAL_SETTINGS') {
    return <GlobalSettingsApp onBack={() => setCurrentSystem(null)} onNavigate={handleNavigate} />
  }

  // Default: Portal
  return <PortalPage onSelectSystem={handleSystemSelect as any} />
}

export default App