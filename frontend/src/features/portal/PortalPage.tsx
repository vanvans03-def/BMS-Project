import { Card, Typography, Row, Col, Space, Badge } from 'antd'
import { ApiOutlined, DatabaseOutlined, RightOutlined, FileSearchOutlined } from '@ant-design/icons'
import AOS from 'aos'
import { useEffect } from 'react'
import { ParticleBackground } from '../../components/ParticleBackground'

const { Title, Text } = Typography

interface PortalPageProps {
  onSelectSystem: (system: 'BACNET' | 'MODBUS' | 'LOGS') => void
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
    background: 'rgba(255, 255, 255, 0.9)', 
    backdropFilter: 'blur(4px)'
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f0f2f5', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: 24,
      position: 'relative', 
      overflow: 'hidden'
    }}>
      
      {/* Background */}
      <ParticleBackground shape="circle" />

      <div style={{ maxWidth: 1200, width: '100%', position: 'relative', zIndex: 10 }}>
        
        {/* ID: portal-title (หัวข้อ) */}
        <div id="portal-title" style={{ textAlign: 'center', marginBottom: 48 }} data-aos="fade-down">
          <Title level={2} style={{ marginBottom: 8, color: '#001529' }}>BMS Portal</Title>
          <Text type="secondary">Select a subsystem to manage</Text>
        </div>

        {/* --- สร้าง ID ใหม่ ครอบทั้ง Row --- */}
        <div id="portal-cards-container">
            <Row gutter={[24, 24]} justify="center">
            
            {/* BACnet Card (ลบ ID ออก) */}
            <Col xs={24} md={8} data-aos="fade-up" data-aos-delay="100">
                <Card 
                hoverable 
                style={cardStyle}
                onClick={() => onSelectSystem('BACNET')}
                className="hover-lift"
                >
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                    <ApiOutlined style={{ fontSize: 56, color: '#1890ff', marginBottom: 24 }} />
                    <Title level={3}>BACnet System</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 24, minHeight: 44 }}>
                    Manage BACnet/IP devices, objects, and schedule commands.
                    </Text>
                    <Space style={{ color: '#1890ff', fontWeight: 500 }}>
                    Enter System <RightOutlined />
                    </Space>
                </div>
                </Card>
            </Col>

            {/* Modbus Card (ลบ ID ออก) */}
            <Col xs={24} md={8} data-aos="fade-up" data-aos-delay="200">
                <Card 
                hoverable 
                style={cardStyle}
                onClick={() => onSelectSystem('MODBUS')}
                className="hover-lift"
                >
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                    <DatabaseOutlined style={{ fontSize: 56, color: '#faad14', marginBottom: 24 }} />
                    <Title level={3}>Modbus System</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 24, minHeight: 44 }}>
                    Control Modbus TCP devices, read coils, and holding registers.
                    </Text>
                    <Space style={{ color: '#faad14', fontWeight: 500 }}>
                    Enter System <RightOutlined />
                    </Space>
                </div>
                </Card>
            </Col>

            {/* Logs Card (ลบ ID ออก) */}
            <Col xs={24} md={8} data-aos="fade-up" data-aos-delay="300">
                <Card 
                hoverable 
                style={cardStyle}
                onClick={() => onSelectSystem('LOGS')}
                className="hover-lift"
                >
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                    <Badge count="All" offset={[10, 0]} color="#722ed1">
                        <FileSearchOutlined style={{ fontSize: 56, color: '#722ed1', marginBottom: 24 }} />
                    </Badge>
                    <Title level={3}>Central Logs</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 24, minHeight: 44 }}>
                    View combined audit logs, history, and system activities.
                    </Text>
                    <Space style={{ color: '#722ed1', fontWeight: 500 }}>
                    View Logs <RightOutlined />
                    </Space>
                </div>
                </Card>
            </Col>

            </Row>
        </div>
      </div>
    </div>
  )
}