import { Card, Typography, Row, Col, Space, Button, message, Tooltip } from 'antd'
import { ApiOutlined, DatabaseOutlined, RightOutlined, SettingOutlined, AppstoreOutlined, FileTextOutlined, ClusterOutlined } from '@ant-design/icons'
import AOS from 'aos'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { ConfigurationModal } from '../bacnet/ConfigurationModal'
import { authFetch } from '../../utils/authFetch'

const { Title, Text } = Typography

interface PortalPageProps {
  onSelectSystem: (system: 'BACNET' | 'MODBUS' | 'LOGS' | 'HIERARCHY' | 'GLOBAL_SETTINGS', view?: string) => void
}

export const PortalPage = ({ onSelectSystem }: PortalPageProps) => {
  const [messageApi, contextHolder] = message.useMessage()

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

  // Unified Config Modal State
  const [configModal, setConfigModal] = useState<{
    open: boolean
    type: 'DRIVER' | 'DEVICE' | 'POINT'
    targetId: number | null
    initialConfig: any
    title?: string
  }>({ open: false, type: 'DRIVER', targetId: null, initialConfig: null })

  const handleSettingsClick = (protocol: 'BACNET' | 'MODBUS') => async (e: React.MouseEvent) => {
    e.stopPropagation()

    // Fetch the driver for this protocol
    try {
      const res = await authFetch('/devices')
      const allDevices = await res.json()

      const protocolKey = protocol === 'BACNET' ? 'BACNET_IP' : 'MODBUS' // Adjust based on your backend protocol strings
      const driver = (Array.isArray(allDevices) ? allDevices : []).find(
        (d: any) => d.device_type === 'DRIVER' && (d.protocol === protocolKey || d.protocol === protocol)
      )

      if (driver) {
        setConfigModal({
          open: true,
          type: 'DRIVER',
          targetId: driver.id,
          initialConfig: driver.config,
          title: `${protocol} Driver Configuration`
        })
      } else {
        // [NEW] Auto-create if MODBUS driver missing
        if (protocol === 'MODBUS') {
          try {
            messageApi.loading('Creating Modbus Driver...', 0.5)
            const createRes = await authFetch('/devices', {
              method: 'POST',
              body: JSON.stringify([{
                device_name: 'Modbus Driver',
                device_instance_id: 99999, // Arbitrary ID for driver
                device_type: 'DRIVER',
                protocol: 'MODBUS',
                network_number: 0,
                ip_address: '127.0.0.1', // Virtual
                config: {
                  pollingInterval: 3000,
                  timeout: 1000,
                  retries: 3
                }
              }])
            })

            if (createRes.ok) {
              // Fetch again to get the ID
              const retryRes = await authFetch('/devices')
              const retryDevices = await retryRes.json()
              const newDriver = retryDevices.find((d: any) => d.device_type === 'DRIVER' && d.protocol === 'MODBUS')

              if (newDriver) {
                setConfigModal({
                  open: true,
                  type: 'DRIVER',
                  targetId: newDriver.id,
                  initialConfig: newDriver.config,
                  title: `Modbus Driver Configuration`
                })
                messageApi.success('Modbus Driver Initialized')
                return
              }
            }
          } catch (e) {
            console.error('Failed to create driver', e)
          }
        }

        messageApi.warning(`No ${protocol} Driver found.`)
      }
    } catch (err) {
      console.error(err)
      messageApi.error('Failed to load driver settings')
    }
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
      {contextHolder}
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
                onClick={handleSettingsClick('BACNET')}
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
                onClick={handleSettingsClick('MODBUS')}
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
        </Row >

        {/* Universal Configuration Modal */}
        <ConfigurationModal
          open={configModal.open}
          onClose={() => setConfigModal(prev => ({ ...prev, open: false }))}
          onSave={() => {
            messageApi.success('Configuration saved')
            // Optionally refetch anything if needed
          }}
          type={configModal.type}
          targetId={configModal.targetId}
          initialConfig={configModal.initialConfig}
          title={configModal.title}
          protocol={configModal.title?.includes('BACNET') ? 'BACNET' : (configModal.title?.includes('MODBUS') ? 'MODBUS' : undefined)}
        />
      </div >

      <style>{`
        .hover-lift-strong:hover {
          border-color: #1890ff !important;
          border-width: 2px !important;
          transform: translateY(-5px);
          box-shadow: 0 12px 24px rgba(24, 144, 255, 0.15);
        }
      `}</style>
    </DashboardLayout >
  )
}