import { Card, Typography, Row, Col, Space } from 'antd'
import { ApiOutlined, DatabaseOutlined, RightOutlined } from '@ant-design/icons'
import AOS from 'aos'
import { useEffect } from 'react'

const { Title, Text } = Typography

interface PortalPageProps {
  onSelectSystem: (system: 'BACNET' | 'MODBUS') => void
}

export const PortalPage = ({ onSelectSystem }: PortalPageProps) => {
  useEffect(() => {
    AOS.refresh()
  }, [])

  const cardStyle = {
    cursor: 'pointer',
    height: '100%',
    transition: 'all 0.3s',
    border: '1px solid #f0f0f0',
    borderRadius: 16,
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f0f2f5', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: 24
    }}>
      <div style={{ maxWidth: 900, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }} data-aos="fade-down">
          <Title level={2} style={{ marginBottom: 8 }}>BMS Portal</Title>
          <Text type="secondary">Select a subsystem to manage</Text>
        </div>

        <Row gutter={[32, 32]} justify="center">
          {/* BACnet Card */}
          <Col xs={24} md={10} data-aos="fade-right" data-aos-delay="100">
            <Card 
              hoverable 
              style={cardStyle}
              onClick={() => onSelectSystem('BACNET')}
              className="hover-lift"
            >
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <ApiOutlined style={{ fontSize: 64, color: '#1890ff', marginBottom: 24 }} />
                <Title level={3}>BACnet System</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                  Manage BACnet/IP devices, objects, and schedule commands.
                </Text>
                <Space style={{ color: '#1890ff', fontWeight: 500 }}>
                  Enter System <RightOutlined />
                </Space>
              </div>
            </Card>
          </Col>

          {/* Modbus Card */}
          <Col xs={24} md={10} data-aos="fade-left" data-aos-delay="200">
            <Card 
              hoverable 
              style={cardStyle}
              onClick={() => onSelectSystem('MODBUS')}
              className="hover-lift"
            >
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <DatabaseOutlined style={{ fontSize: 64, color: '#faad14', marginBottom: 24 }} />
                <Title level={3}>Modbus System</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                  Control Modbus TCP devices, read coils, and holding registers.
                </Text>
                <Space style={{ color: '#faad14', fontWeight: 500 }}>
                  Enter System <RightOutlined />
                </Space>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}