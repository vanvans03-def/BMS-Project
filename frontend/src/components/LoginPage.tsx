import { useState } from 'react'
import { Form, Input, Button, Card, Typography, Layout, theme } from 'antd'
import { UserOutlined, LockOutlined, DatabaseOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'

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
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* 1. Header (Optional: ให้เหมือน Navbar ด้านใน แต่โล่งๆ) */}
      <div 
        style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            padding: '0 50px',
            background: '#001529', // สีเดียวกับ Header ด้านใน
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
            padding: '50px 0'
        }}
      >
        {/* Logo & Title Area */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <DatabaseOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            <Title level={2} style={{ margin: '16px 0 8px' }}>Sign in to BMS</Title>
            <Text type="secondary">Building Management System Dashboard</Text>
        </div>

        {/* Login Card */}
        <Card 
          style={{ 
            width: 400, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)', // เงาบางๆ แบบ Professional
            borderRadius: borderRadiusLG,
            background: colorBgContainer
          }}
          bordered={false}
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
                   Default: admin / password
                </Text>
            </div>
          </Form>
        </Card>
      </Content>

      <Footer style={{ textAlign: 'center', background: 'transparent' }}>
        BMS Project ©{new Date().getFullYear()} Created by YourTeam
      </Footer>
    </Layout>
  )
}