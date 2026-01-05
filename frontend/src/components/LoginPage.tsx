/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from 'react'
import { Form, Input, Button, Card, Typography, Layout, theme } from 'antd'
import { UserOutlined, LockOutlined, DatabaseOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { ParticleBackground } from '../components/ParticleBackground' // ตรวจสอบ path ให้ถูกนะครับ

const { Title, Text } = Typography
const { Content, Footer } = Layout

export const LoginPage = () => {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    await login(values.username, values.password)
    setLoading(false)
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5', position: 'relative' }}>
      
      {/* Background: เลือก shape ได้ตามใจชอบ (circle, square, hexagon, triangle, mixed) */}
      <ParticleBackground shape="circle" />

      {/* Header */}
      <div 
        style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            padding: '0 50px',
            background: '#001529',
            zIndex: 10,
            position: 'relative'
        }}
      >
         <div style={{ display: 'flex', alignItems: 'center', color: 'white' }}>
            <DatabaseOutlined style={{ fontSize: 24, marginRight: 10, color: '#1890ff' }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>BMS Project</span>
         </div>
      </div>

      <Content 
        style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            flexDirection: 'column',
            padding: '50px 0',
            zIndex: 10, 
            position: 'relative'
        }}
      >
        {/* --- เพิ่ม id="login-title-section" เพื่อทำเป็นกำแพง --- */}
        <div id="login-title-section" style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ 
                background: 'white', 
                padding: 16, 
                borderRadius: '50%', 
                display: 'inline-block',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
                <DatabaseOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </div>
            <Title level={2} style={{ margin: '16px 0 8px', color: '#001529' }}>Sign in to BMS</Title>
            <Text type="secondary">Building Management System Dashboard</Text>
        </div>

        {/* --- id="login-card" เพื่อทำเป็นกำแพง --- */}
        <Card 
          id="login-card" 
          style={{ 
            width: 400, 
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', 
            borderRadius: borderRadiusLG,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)'
          }}
          variant="borderless"
        >
          <Form
            name="login"
            onFinish={onFinish}
            size="large"
            layout="vertical"
            autoComplete="off"
            initialValues={{ remember: true }}
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Please enter your username' }]}
            >
              <Input 
                prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} 
                placeholder="Username" 
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password 
                prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} 
                placeholder="Password" 
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading} 
                block
                style={{ fontWeight: 500 }}
              >
                Sign in
              </Button>
            </Form.Item>
            
            <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                   Default: admin / 1234
                </Text>
            </div>
          </Form>
        </Card>
      </Content>

      {/* --- id="app-footer" เพื่อทำเป็นกำแพง --- */}
      <Footer 
        id="app-footer" 
        style={{ 
            textAlign: 'center', 
            background: 'transparent', 
            zIndex: 10, 
            position: 'relative',
            color: '#666'
        }}
      >
        BMS Project ©{new Date().getFullYear()} Created by CocoaD
      </Footer>
    </Layout>
  )
}