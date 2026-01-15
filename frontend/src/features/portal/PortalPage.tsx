import { Card, Typography, Row, Col, Space, Button, Modal, Tooltip } from 'antd'
import { ApiOutlined, DatabaseOutlined, RightOutlined, SettingOutlined, AppstoreOutlined, FileTextOutlined, ClusterOutlined } from '@ant-design/icons'
import AOS from 'aos'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { NetworkSettings } from '../../components/SettingsTabs'

const { Title, Text } = Typography

interface PortalPageProps {
  onSelectSystem: (system: 'BACNET' | 'MODBUS' | 'LOGS' | 'HIERARCHY' | 'GLOBAL_SETTINGS', view?: string) => void
}

export const PortalPage = ({ onSelectSystem }: PortalPageProps) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useEffect(() => {
    AOS.refresh()
  }, [])

  const cardStyle = {
    cursor: 'pointer',
    height: '100%',
    transition: 'all 0.3s',
    border: '1px solid #d9d9d9', // Thicker default border
    borderRadius: 16,
    position: 'relative' as const,
    background: 'white' // Ensure cards stay white
  }

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsSettingsOpen(true)
  }

  // Header Actions (Restoring Tab-like feel)
  const headerActions = (
    <Space size="small">
      <Tooltip title="View Central Logs">
        <Button
          type="text"
          icon={<FileTextOutlined />}
          style={{ color: 'white' }}
          onClick={() => onSelectSystem('LOGS')}
        >
          Central Logs
        </Button>
      </Tooltip>
      <Tooltip title="System Hierarchy">
        <Button
          type="text"
          icon={<ClusterOutlined />}
          style={{ color: 'white' }}
          onClick={() => onSelectSystem('GLOBAL_SETTINGS')}
        >
          Global Settings
        </Button>
      </Tooltip>
    </Space>
  )

  return (
    <DashboardLayout
      title="System Portal"
      headerIcon={<AppstoreOutlined />}
      themeColor="#1890ff"
      currentView="dashboard"
      onMenuClick={() => { }}
      showMenu={false}
      headerActions={headerActions}
      contentStyle={{ background: 'transparent', boxShadow: 'none' }} // Darker background
    >
      <div style={{ maxWidth: 900, margin: '0 auto', paddingTop: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Title level={2}>Welcome to BMS Portal</Title>
          <Text type="secondary" style={{ fontSize: 16 }}>Select a protocol to manage your building management system</Text>
        </div>

        <Row gutter={[24, 24]} justify="center">
          {/* 1. BACnet Card */}
          <Col xs={24} sm={12} data-aos="fade-up" data-aos-delay="100">
            <Card
              hoverable
              style={cardStyle}
              onClick={() => onSelectSystem('BACNET')}
              className="hover-lift-strong"
              bodyStyle={{ padding: '32px 24px' }}
            >
              <Button
                type="text"
                icon={<SettingOutlined style={{ fontSize: 18 }} />}
                style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, color: '#8c8c8c' }}
                onClick={handleSettingsClick}
              />
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  background: 'rgba(24, 144, 255, 0.1)',
                  borderRadius: '50%',
                  width: 80,
                  height: 80,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px'
                }}>
                  <ApiOutlined style={{ fontSize: 40, color: '#1890ff' }} />
                </div>
                <Title level={4} style={{ marginBottom: 12 }}>BACnet Protocol</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 24, minHeight: 44, fontSize: 13 }}>
                  Manage BACnet devices, discover objects, and monitor real-time data.
                </Text>
                <Space style={{ color: '#1890ff', fontWeight: 500 }}>
                  Enter System <RightOutlined />
                </Space>
              </div>
            </Card>
          </Col>

          {/* 2. Modbus Card */}
          <Col xs={24} sm={12} data-aos="fade-up" data-aos-delay="200">
            <Card
              hoverable
              style={cardStyle}
              onClick={() => onSelectSystem('MODBUS')}
              className="hover-lift-strong"
              bodyStyle={{ padding: '32px 24px' }}
            >
              <Button
                type="text"
                icon={<SettingOutlined style={{ fontSize: 18 }} />}
                style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, color: '#8c8c8c' }}
                onClick={handleSettingsClick}
              />
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  background: 'rgba(250, 173, 20, 0.1)',
                  borderRadius: '50%',
                  width: 80,
                  height: 80,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px'
                }}>
                  <DatabaseOutlined style={{ fontSize: 40, color: '#faad14' }} />
                </div>
                <Title level={4} style={{ marginBottom: 12 }}>Modbus Protocol</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 24, minHeight: 44, fontSize: 13 }}>
                  Control Modbus TCP devices, read coils, and holding registers.
                </Text>
                <Space style={{ color: '#faad14', fontWeight: 500 }}>
                  Enter System <RightOutlined />
                </Space>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Network Settings Modal */}
        <Modal
          title="Network Configuration"
          open={isSettingsOpen}
          onCancel={() => setIsSettingsOpen(false)}
          footer={null}
          width={800}
          destroyOnClose
        >
          <NetworkSettings />
        </Modal>
      </div>

      <style>{`
        .hover-lift-strong:hover {
          border-color: #1890ff !important;
          border-width: 2px !important;
          transform: translateY(-5px);
          box-shadow: 0 12px 24px rgba(24, 144, 255, 0.15);
        }
      `}</style>
    </DashboardLayout>
  )
}