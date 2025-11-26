import { useState, useEffect } from 'react'
import { 
  Card, 
  DatePicker, 
  Select, 
  Button, 
  Table, 
  Tag, 
  Space, 
  Row, 
  Col, 
  Typography 
} from 'antd'
import { 
  SearchOutlined, 
  DownloadOutlined, 
  FileTextOutlined,
  UserOutlined,
  SettingOutlined,
  EditOutlined,
  ArrowRightOutlined // [NEW] Import ไอคอนลูกศร
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import AOS from 'aos'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

// Mock Data สำหรับ Audit Logs
interface AuditLog {
  id: number
  timestamp: string
  user: string
  action: 'WRITE' | 'SETTING' | 'USER'
  target: string
  details: string
}

const mockLogs: AuditLog[] = [
  { id: 1, timestamp: '2025-11-25 10:45:00', user: 'Admin', action: 'WRITE', target: 'AHU-01_Run', details: 'Off -> On' },
  { id: 2, timestamp: '2025-11-25 10:30:00', user: 'Admin', action: 'SETTING', target: 'Network Port', details: '47808 -> 47809' },
  { id: 3, timestamp: '2025-11-25 10:15:00', user: 'Teera', action: 'WRITE', target: 'Temp_Set', details: '24.0 -> 22.5' },
  { id: 4, timestamp: '2025-11-25 10:00:00', user: 'Admin', action: 'USER', target: 'Teera', details: 'Added new user' },
  { id: 5, timestamp: '2025-11-24 18:20:00', user: 'System', action: 'WRITE', target: 'Schedule_Main', details: 'Occupied -> Unoccupied' },
]

export const LogsPage = () => {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    AOS.refresh()
  }, [])

  const handleSearch = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }

  const columns: ColumnsType<AuditLog> = [
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (text) => (
        <Space direction="vertical" size={0}>
            <Text>{dayjs(text).format('DD/MM/YYYY')}</Text>
            <Text type="secondary" style={{fontSize: 12}}>{dayjs(text).format('HH:mm:ss')}</Text>
        </Space>
      )
    },
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
      width: 120,
      render: (text) => (
        <Space>
            <UserOutlined style={{color: '#1890ff'}} />
            <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: string) => {
        let color = 'default'
        let icon = <FileTextOutlined />
        
        if (action === 'WRITE') { color = 'orange'; icon = <EditOutlined /> }
        if (action === 'SETTING') { color = 'blue'; icon = <SettingOutlined /> }
        if (action === 'USER') { color = 'green'; icon = <UserOutlined /> }

        return (
          <Tag color={color} icon={icon}>
            {action}
          </Tag>
        )
      }
    },
    {
      title: 'Target',
      dataIndex: 'target',
      key: 'target',
      width: 150,
      responsive: ['md'],
      render: (text) => <Text code>{text}</Text>
    },
    {
      title: 'Details',
      dataIndex: 'details',
      key: 'details',
      // [MODIFIED] ปรับแต่งการแสดงผล Details ให้ใช้ Arrow Icon
      render: (text) => {
        if (text.includes('->')) {
            const [oldVal, newVal] = text.split('->').map((s: string) => s.trim())
            return (
                <Space>
                    <Text type="secondary">{oldVal}</Text>
                    <ArrowRightOutlined style={{ fontSize: 12, color: '#999' }} />
                    <Text strong>{newVal}</Text>
                </Space>
            )
        }
        return <Text>{text}</Text>
      }
    },
  ]

  return (
    <>
        {/* Header Section */}
        <div style={{ marginBottom: 24 }} data-aos="fade-down">
            <Title level={3} style={{ margin: 0, marginBottom: 8 }}>
            <FileTextOutlined /> System Audit Logs
            </Title>
            <Text type="secondary">Track and monitor system activities, user actions, and value changes.</Text>
        </div>

        {/* Filter Section */}
        <div data-aos="fade-up" data-aos-delay="100">
            <Card style={{ marginBottom: 24 }} bordered={false}>
                <Row gutter={[16, 16]} align="bottom">
                    <Col xs={24} md={8} lg={6}>
                        <Text strong>Date Range</Text>
                        <RangePicker 
                            style={{ width: '100%', marginTop: 8 }} 
                            presets={[
                                { label: 'Today', value: [dayjs(), dayjs()] },
                                { label: 'Yesterday', value: [dayjs().subtract(1, 'd'), dayjs().subtract(1, 'd')] },
                                { label: 'Last 7 Days', value: [dayjs().subtract(7, 'd'), dayjs()] },
                            ]}
                        />
                    </Col>
                    <Col xs={12} md={6} lg={4}>
                        <Text strong>User</Text>
                        <Select 
                            defaultValue="all" 
                            style={{ width: '100%', marginTop: 8 }}
                            options={[
                                { value: 'all', label: 'All Users' },
                                { value: 'admin', label: 'Admin' },
                                { value: 'teera', label: 'Teera' },
                            ]}
                        />
                    </Col>
                    <Col xs={12} md={6} lg={4}>
                        <Text strong>Action Type</Text>
                        <Select 
                            defaultValue="all" 
                            style={{ width: '100%', marginTop: 8 }}
                            options={[
                                { value: 'all', label: 'All Actions' },
                                { value: 'write', label: 'Write Point' },
                                { value: 'setting', label: 'System Setting' },
                                { value: 'user', label: 'User Mgmt' },
                            ]}
                        />
                    </Col>
                    <Col xs={24} md={4} lg={10} style={{ textAlign: 'right' }}>
                        <Space>
                            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} loading={loading}>
                                Search
                            </Button>
                            <Button icon={<DownloadOutlined />}>
                                Export
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>
        </div>

        {/* Table Section */}
        <div data-aos="fade-up" data-aos-delay="200">
            <Card title="Log Records (Latest First)" bordered={false}>
                <Table 
                    columns={columns} 
                    dataSource={mockLogs} 
                    rowKey="id"
                    loading={loading}
                    pagination={{ 
                        pageSize: 10, 
                        showSizeChanger: true 
                    }}
                    scroll={{ x: 800 }}
                />
            </Card>
        </div>
    </>
  )
}