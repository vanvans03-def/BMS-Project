import { Card, Statistic, Row, Col } from 'antd'
import {
  DatabaseOutlined,
  WifiOutlined,
  ClockCircleOutlined,
  EyeOutlined
} from '@ant-design/icons'

interface DeviceStatsProps {
  total: number
  online: number
  offline: number
}

interface PointStatsProps {
  total: number
  monitoring: number
  inputs: number
  outputs: number
}

export const DeviceStatsCards = ({ total, online, offline }: DeviceStatsProps) => {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={12} sm={12} md={6}>
        <Card>
          <Statistic
            title="Total Devices"
            value={total}
            prefix={<DatabaseOutlined />}
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={12} md={6}>
        <Card>
          <Statistic
            title="Online"
            value={online}
            prefix={<WifiOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={12} md={6}>
        <Card>
          <Statistic
            title="Offline"
            value={offline}
            prefix={<WifiOutlined />}
            valueStyle={{ color: '#999' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={12} md={6}>
        <Card>
          <Statistic
            title="Last Scan"
            value="Just now"
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
    </Row>
  )
}

export const PointStatsCards = ({ total, monitoring, inputs, outputs }: PointStatsProps) => {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={12} sm={6}>
        <Card size="small">
          <Statistic
            title="Total Points"
            value={total}
            valueStyle={{ fontSize: 20 }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card size="small">
          <Statistic
            title="Monitoring"
            value={monitoring}
            valueStyle={{ fontSize: 20, color: '#52c41a' }}
            prefix={<EyeOutlined />}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card size="small">
          <Statistic
            title="Inputs"
            value={inputs}
            valueStyle={{ fontSize: 20, color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card size="small">
          <Statistic
            title="Outputs"
            value={outputs}
            valueStyle={{ fontSize: 20, color: '#faad14' }}
          />
        </Card>
      </Col>
    </Row>
  )
}