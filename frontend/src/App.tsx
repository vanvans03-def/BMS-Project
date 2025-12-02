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
import CentralLogsApp from './features/logs/CentralLogsApp' // [New Import]

const { Content } = Layout

function App() {
  const { isAuthenticated, isLoading } = useAuth()
  
  // เพิ่ม state 'LOGS'
  const [currentSystem, setCurrentSystem] = useState<'BACNET' | 'MODBUS' | 'LOGS' | null>(null)

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
    return <BACnetApp onBack={() => setCurrentSystem(null)} />
  }

  if (currentSystem === 'MODBUS') {
    return <ModbusApp onBack={() => setCurrentSystem(null)} />
  }

  if (currentSystem === 'LOGS') {
    return <CentralLogsApp onBack={() => setCurrentSystem(null)} />
  }

  // Default: Portal
  return <PortalPage onSelectSystem={setCurrentSystem} />
}

export default App