// frontend/src/App.tsx
import { useEffect } from 'react'
import { Spin, Layout } from 'antd'
import { useAuth } from './contexts/AuthContext'
import { LoginPage } from './components/LoginPage'
import AppContent from './AppContent' // แยก Content ออกมา
import AOS from 'aos'
import 'aos/dist/aos.css'
import './app/animations.css'

const { Content } = Layout

function App() {
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    AOS.init({
      duration: 600,
      easing: 'ease-out-cubic',
      once: false,
      offset: 50,
      delay: 0,
    })
  }, [])

  // ⏳ แสดง Loading ขณะตรวจสอบ Auth
  if (isLoading) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
        <Content style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          flexDirection: 'column',
          gap: 16
        }}>
          <Spin size="large" />
          <div style={{ color: '#999', marginTop: 16 }}>
            Checking authentication...
          </div>
        </Content>
      </Layout>
    )
  }

  // 🔐 แสดง Login หรือ Main App
  return isAuthenticated ? <AppContent /> : <LoginPage />
}

export default App