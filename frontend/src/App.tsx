import { useEffect, useState } from 'react'
import { Spin, Layout } from 'antd'
import { useAuth } from './contexts/AuthContext'
import { LoginPage } from './components/LoginPage'
import { PortalPage } from './components/PortalPage'
import AppContent from './AppContent'
import { ModbusApp } from './ModbusApp'
import AOS from 'aos'
import 'aos/dist/aos.css'
import './app/animations.css'

const { Content } = Layout

function App() {
  const { isAuthenticated, isLoading } = useAuth()
  const [currentSystem, setCurrentSystem] = useState<'BACNET' | 'MODBUS' | null>(null)

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

  // Case 1: Not Logged In -> Show Login
  if (!isAuthenticated) {
    return <LoginPage />
  }

  // Case 2: Logged In & System Selected -> Show Dashboard
  if (currentSystem === 'BACNET') {
    // [แก้ไข] ส่ง onBack เพื่อเคลียร์ค่า currentSystem (กลับหน้า Portal)
    // ไม่ต้องมี div ครอบ หรือปุ่มลอยแล้ว เพราะ AppContent จะแสดงปุ่มใน Header เอง
    return <AppContent onBack={() => setCurrentSystem(null)} />
  }

  if (currentSystem === 'MODBUS') {
    return <ModbusApp onBack={() => setCurrentSystem(null)} />
  }

  // Case 3: Logged In & No System Selected -> Show Portal
  return <PortalPage onSelectSystem={setCurrentSystem} />
}

export default App