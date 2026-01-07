import { useState } from 'react'
import { Layout, Button, Space, Typography, Dropdown, Avatar, Divider, theme } from 'antd'
import {
  ArrowLeftOutlined, UserOutlined, LogoutOutlined, DownOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContext'
import { LogsPage } from '../../components/LogsPage'
import { Tabs } from 'antd'
import HistoryLogsPanel from './HistoryLogsPanel'
import { ProfileModal } from '../../components/ProfileModal'

const { Header, Content } = Layout
const { Title, Text } = Typography

interface CentralLogsAppProps {
  onBack: () => void
}

export default function CentralLogsApp({ onBack }: CentralLogsAppProps) {
  const { user, logout } = useAuth()
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken()

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: 'Profile',
        onClick: () => setIsProfileModalOpen(true)
      },
      { type: 'divider' as const },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Logout',
        danger: true,
        onClick: logout
      }
    ]
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          background: '#001529',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}
      >
        <Space style={{ cursor: 'pointer', marginRight: 16 }} onClick={onBack}>
          <ArrowLeftOutlined style={{ color: 'white', fontSize: 18 }} />
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 600 }}>Portal</Text>
        </Space>

        <Divider type="vertical" style={{ background: 'rgba(255,255,255,0.2)', margin: '0 16px' }} />

        <div style={{ fontSize: 24, marginRight: 12, color: '#722ed1', display: 'flex', alignItems: 'center' }}>
          <FileTextOutlined />
        </div>
        <Title level={4} style={{ margin: 0, color: 'white' }}>
          Central Logs
        </Title>

        <div style={{ flex: 1 }} />

        <Space>
          <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
            <Button type="text" style={{ color: 'white', height: 'auto', padding: '4px 12px' }}>
              <Space>
                <Avatar style={{ backgroundColor: '#722ed1' }} icon={<UserOutlined />} />
                <Text style={{ color: "white", display: window.innerWidth > 768 ? "inline" : "none" }}>
                  {user?.username || 'User'}
                </Text>
                <DownOutlined style={{ fontSize: 12 }} />
              </Space>
            </Button>
          </Dropdown>
        </Space>
      </Header>

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
          <Tabs defaultActiveKey="audit" items={[
            {
              key: 'audit',
              label: 'Audit Logs',
              children: <LogsPage />
            },
            {
              key: 'history',
              label: 'History Logs',
              children: <HistoryLogsPanel />
            }
          ]} />
        </Content>
      </Layout>

      <ProfileModal open={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </Layout>
  )
}