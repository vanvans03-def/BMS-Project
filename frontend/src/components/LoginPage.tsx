/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { Form, Input, Button, Card, Typography, message, Layout } from 'antd'
import { UserOutlined, LockOutlined, DatabaseOutlined } from '@ant-design/icons'
import { config } from '../config'

const { Title, Text } = Typography
const { Content } = Layout

interface LoginPageProps {
  onLoginSuccess: (token: string) => void
}

export const LoginPage = ({ onLoginSuccess }: LoginPageProps) => {
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      const res = await fetch(`${config.apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })
      
      const data = await res.json()
      
      if (res.ok && data.success) {
        message.success('Welcome back!')
        onLoginSuccess(data.token)
      } else {
        message.error(data.message || 'Login failed')
      }
    } catch (err) {
      message.error('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Card 
          style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          bordered={false}
        >
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <DatabaseOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
            <Title level={3} style={{ margin: 0 }}>BMS Login</Title>
            <Text type="secondary">Building Management System</Text>
          </div>

          <Form
            name="login"
            onFinish={onFinish}
            size="large"
            layout="vertical"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Please input your Username!' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Username" />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please input your Password!' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Password" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Log in
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Content>
    </Layout>
  )
}