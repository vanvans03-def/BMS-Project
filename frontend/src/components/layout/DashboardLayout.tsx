import React, { useState } from 'react';
import { Layout, Menu, Button, Space, Typography, Dropdown, Avatar, Divider, theme } from 'antd';
import {
  AppstoreOutlined, FileTextOutlined,
  ArrowLeftOutlined, UserOutlined, LogoutOutlined, DownOutlined, ClusterOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

interface DashboardLayoutProps {
  title: string;
  headerIcon: React.ReactNode;
  themeColor: string;
  onBack?: () => void;
  currentView: string;
  onMenuClick: (key: string) => void;
  children: React.ReactNode;
  onProfileClick?: () => void;
  showMenu?: boolean;
  menuItems?: any[]; // Allow custom menu items
  contentStyle?: React.CSSProperties; // Allow custom content styles
  headerActions?: React.ReactNode;
  onSystemSelect?: (system: 'BACNET' | 'MODBUS' | 'LOGS' | 'HIERARCHY' | 'GLOBAL_SETTINGS', view?: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  title,
  headerIcon,
  themeColor,
  onBack,
  currentView,
  onMenuClick,
  children,
  onProfileClick,
  showMenu = true,
  menuItems,
  headerActions,
  contentStyle,
  onSystemSelect
}) => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  const defaultMenuItems = [
    { key: "dashboard", icon: <AppstoreOutlined />, label: "Dashboard" },
    { key: "logs", icon: <FileTextOutlined />, label: "Logs" },
  ];

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: 'Profile',
        onClick: onProfileClick
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
  };

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
        {onBack && (
          <Space style={{ cursor: 'pointer', marginRight: 16 }} onClick={onBack}>
            <ArrowLeftOutlined style={{ color: 'white', fontSize: 18 }} />
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 600 }}>Portal</Text>
          </Space>
        )}

        <Divider type="vertical" style={{ background: 'rgba(255,255,255,0.2)', margin: '0 16px' }} />

        <div style={{ fontSize: 24, marginRight: 12, color: themeColor, display: 'flex', alignItems: 'center' }}>
          {headerIcon}
        </div>
        <Title level={4} style={{ margin: 0, color: 'white' }}>
          {title}
        </Title>

        <div style={{ flex: 1 }} />

        <Space size="middle">
          {onSystemSelect && (
            <>
              <Button
                type="text"
                icon={<FileTextOutlined />}
                style={{ color: 'white' }}
                onClick={() => onSystemSelect('LOGS')}
              >
                Central Logs
              </Button>
              <Button
                type="text"
                icon={<ClusterOutlined />}
                style={{ color: 'white' }}
                onClick={() => onSystemSelect('GLOBAL_SETTINGS')}
              >
                Global Settings
              </Button>
              <Divider type="vertical" style={{ background: 'rgba(255,255,255,0.2)' }} />
            </>
          )}
          {/* Custom Header Actions (e.g. Settings) */}
          {headerActions}

          <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
            <Button type="text" style={{ color: 'white', height: 'auto', padding: '4px 12px' }}>
              <Space>
                <Avatar style={{ backgroundColor: themeColor }} icon={<UserOutlined />} />
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
        {showMenu && (
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
              selectedKeys={[currentView]}
              onClick={({ key }) => onMenuClick(key)}
              items={menuItems || defaultMenuItems}
            />
          </Sider>
        )}

        <Layout style={{ padding: "16px" }}>
          <Content
            style={{
              padding: 24,
              margin: 0,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              minHeight: "calc(100vh - 64px - 32px)",
              ...contentStyle // Apply custom logic
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};