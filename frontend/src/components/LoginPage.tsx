/* eslint-disable @typescript-eslint/no-unused-vars */
// frontend/src/components/LoginPage.tsx
import { useState } from 'react'
import { Form, Input, Button, Card, Typography, Layout } from 'antd'
import { UserOutlined, LockOutlined, DatabaseOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'

const { Title, Text } = Typography
const { Content } = Layout

export const LoginPage = () => {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    const success = await login(values.username, values.password)
    setLoading(false)
    
    // ถ้า Login สำเร็จ AuthContext จะจัดการ redirect ให้
    // (ไม่ต้องทำอะไรเพิ่ม)
  }

  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Card 
          style={{ 
            width: 400, 
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            borderRadius: 12
          }}
          bordered={false}
        >
          {/* Logo & Title */}
          <div style={{ textAlign: 'center', marginBottom: 32 }} data-aos="zoom-in">
            <DatabaseOutlined 
              style={{ 
                fontSize: 64, 
                color: '#1890ff', 
                marginBottom: 16,
                animation: 'pulse 2s infinite'
              }} 
            />
            <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
              BMS Login
            </Title>
            <Text type="secondary" style={{ fontSize: 16 }}>
              Building Management System
            </Text>
          </div>

          {/* Login Form */}
          <Form
            name="login"
            onFinish={onFinish}
            size="large"
            layout="vertical"
            autoComplete="off"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Please enter your username' }]}
            >
              <Input 
                prefix={<UserOutlined style={{ color: '#1890ff' }} />} 
                placeholder="Username" 
                disabled={loading}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password 
                prefix={<LockOutlined style={{ color: '#1890ff' }} />} 
                placeholder="Password" 
                disabled={loading}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 8 }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading} 
                block
                style={{ height: 48, fontSize: 16, fontWeight: 500 }}
              >
                {loading ? 'Logging in...' : 'Log in'}
              </Button>
            </Form.Item>
          </Form>

          {/* Footer Info */}
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Demo: admin / password
            </Text>
          </div>
        </Card>
      </Content>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}
      </style>
    </Layout>
  )
}