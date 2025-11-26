// frontend/src/components/LogsPage.tsx
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useState, useEffect } from 'react'
import { 
  Card, DatePicker, Select, Button, Table, Tag, Space, 
  Row, Col, Typography, message 
} from 'antd'
import { 
  SearchOutlined, DownloadOutlined, FileTextOutlined,
  UserOutlined, SettingOutlined, EditOutlined, ArrowRightOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import AOS from 'aos'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx-js-style' 
import { authFetch } from '../utils/authFetch'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

interface AuditLog {
  id: number
  timestamp: string
  user_name: string
  action_type: 'WRITE' | 'SETTING' | 'USER'
  target_name: string
  details: string
}

export const LogsPage = () => {
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([dayjs(), dayjs()])
  const [userFilter, setUserFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')

  useEffect(() => {
    AOS.refresh()
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.append('startDate', dateRange[0].format('YYYY-MM-DD'))
        params.append('endDate', dateRange[1].format('YYYY-MM-DD'))
      }
      
      if (userFilter !== 'all') params.append('user', userFilter)
      if (actionFilter !== 'all') params.append('actionType', actionFilter)

      const res = await authFetch(`/audit-logs?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch logs')
      
      const data = await res.json()
      setLogs(data)
      setCurrentPage(1)
    } catch (error) {
      console.error(error)
      message.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  // [UPDATED] ปรับปรุงฟังก์ชัน Export (Border All + Wider Details)
  const handleExport = () => {
    if (logs.length === 0) {
      message.warning('No data to export')
      return
    }

    const dataToExport = logs.map(log => {
        let cleanTarget = log.target_name
        if (cleanTarget && cleanTarget.startsWith('[')) {
             cleanTarget = cleanTarget.replace('OBJECT_', '').replace(/_/g, ' ')
        } else if (cleanTarget) {
             cleanTarget = cleanTarget.replace('OBJECT_', '').replace(/_/g, ' ')
        }

        return {
            ID: log.id,
            Time: dayjs(log.timestamp).format('DD/MM/YYYY HH:mm:ss'),
            User: log.user_name,
            Action: log.action_type,
            Target: cleanTarget,
            Details: log.details
        }
    })

    const ws = XLSX.utils.json_to_sheet(dataToExport)

    // 1. กำหนดความกว้างของคอลัมน์ (ขยาย Details เป็น 100)
    ws['!cols'] = [
        { wch: 8 },   // ID
        { wch: 20 },  // Time
        { wch: 15 },  // User
        { wch: 12 },  // Action
        { wch: 30 },  // Target
        { wch: 100 }  // Details (กว้างสะใจ)
    ]

    // 2. วนลูปใส่ Style ให้ทุกเซลล์ (Border All)
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1')
    
    // กำหนด Border Style แบบใช้ซ้ำ
    const borderStyle = {
        top: { style: 'thin', color: { rgb: "000000" } },
        bottom: { style: 'thin', color: { rgb: "000000" } },
        left: { style: 'thin', color: { rgb: "000000" } },
        right: { style: 'thin', color: { rgb: "000000" } }
    }

    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_cell({ r: R, c: C })
            if (!ws[address]) continue

            if (R === 0) {
                // --- สไตล์ Header ---
                ws[address].s = {
                    font: {
                        name: 'Arial',
                        sz: 11,
                        bold: true,
                        color: { rgb: "FFFFFF" } // ตัวหนังสือขาว
                    },
                    fill: {
                        fgColor: { rgb: "1890FF" } // พื้นหลังน้ำเงิน
                    },
                    alignment: {
                        horizontal: "center",
                        vertical: "center"
                    },
                    border: borderStyle // ใส่ขอบ
                }
            } else {
                // --- สไตล์ Data ---
                ws[address].s = {
                    font: {
                        name: 'Arial',
                        sz: 10
                    },
                    alignment: {
                        vertical: "center", // จัดกึ่งกลางแนวตั้ง
                        wrapText: true,     // ตัดบรรทัดถ้ายาวเกิน
                        horizontal: "left"
                    },
                    border: borderStyle // ใส่ขอบ
                }
            }
        }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Audit Logs")

    const fileName = `AuditLogs_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`
    XLSX.writeFile(wb, fileName)
    message.success(`Exported ${logs.length} rows successfully`)
  }

  const formatTargetName = (name: string) => {
    if (name && name.startsWith('[')) {
        const parts = name.match(/^(\[.*?\])\s*(.*)/)
        if (parts) {
            const deviceName = parts[1]
            const pointName = parts[2].replace('OBJECT_', '').replace(/_/g, ' ')
            return (
                <Space direction="vertical" size={0}>
                    <Text type="secondary" style={{fontSize: 11}}>{deviceName}</Text>
                    <Text strong style={{fontSize: 13}}>{pointName}</Text>
                </Space>
            )
        }
    }
    return <Text>{(name || '').replace('OBJECT_', '').replace(/_/g, ' ')}</Text>
  }

  const columns: ColumnsType<AuditLog> = [
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (text) => (
        <Space direction="vertical" size={0}>
            <Text>{dayjs(text).format('DD/MM/YYYY')}</Text>
            <Text type="secondary" style={{fontSize: 12}}>{dayjs(text).format('HH:mm:ss')}</Text>
        </Space>
      )
    },
    {
      title: 'User',
      dataIndex: 'user_name',
      key: 'user_name',
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
      dataIndex: 'action_type',
      key: 'action_type',
      width: 110,
      align: 'center',
      render: (action: string) => {
        let color = 'default'
        let icon = <FileTextOutlined />
        
        if (action === 'WRITE') { color = 'orange'; icon = <EditOutlined /> }
        if (action === 'SETTING') { color = 'blue'; icon = <SettingOutlined /> }
        if (action === 'USER') { color = 'green'; icon = <UserOutlined /> }

        return (
          <Tag color={color} icon={icon} style={{marginRight: 0, minWidth: 80}}>
            {action}
          </Tag>
        )
      }
    },
    {
      title: 'Target',
      dataIndex: 'target_name',
      key: 'target_name',
      width: 250, 
      render: (text) => formatTargetName(text)
    },
    {
      title: 'Details',
      dataIndex: 'details',
      key: 'details',
      render: (text) => {
        if (text && text.includes('->')) {
            const parts = text.split('->')
            const oldVal = parts[0].trim()
            const newValPart = parts[1] ? parts[1].trim() : ''
            const newVal = newValPart.split('(')[0].trim()
            const extra = newValPart.includes('(') ? `(${newValPart.split('(')[1]}` : ''

            return (
                <Space wrap>
                    <Tag>{oldVal}</Tag>
                    <ArrowRightOutlined style={{ fontSize: 12, color: '#999' }} />
                    <Tag color="processing">{newVal}</Tag>
                    {extra && <Text type="secondary" style={{fontSize: 11}}>{extra}</Text>}
                </Space>
            )
        }
        return <Text>{text}</Text>
      }
    },
  ]

  return (
    <>
        <div style={{ marginBottom: 24 }} data-aos="fade-down">
            <Title level={3} style={{ margin: 0, marginBottom: 8 }}>
              <FileTextOutlined /> System Audit Logs
            </Title>
            <Text type="secondary">Track system activities and user actions</Text>
        </div>

        <div data-aos="fade-up" data-aos-delay="100">
            <Card style={{ marginBottom: 24 }}>
                <Row gutter={[16, 16]} align="bottom">
                    <Col xs={24} md={8} lg={6}>
                        <Text strong>Date Range</Text>
                        {/* @ts-ignore */}
                        <RangePicker 
                            style={{ width: '100%', marginTop: 8 }} 
                            value={dateRange}
                            onChange={(dates) => setDateRange(dates as any)}
                            presets={[
                                { label: 'Today', value: [dayjs(), dayjs()] },
                                { label: 'Last 7 Days', value: [dayjs().subtract(7, 'd'), dayjs()] },
                            ]}
                        />
                    </Col>
                    <Col xs={12} md={6} lg={4}>
                        <Text strong>User</Text>
                        <Select 
                            value={userFilter}
                            onChange={setUserFilter}
                            style={{ width: '100%', marginTop: 8 }}
                            options={[
                                { value: 'all', label: 'All Users' },
                                { value: 'Admin', label: 'Admin' },
                            ]}
                        />
                    </Col>
                    <Col xs={12} md={6} lg={4}>
                        <Text strong>Action</Text>
                        <Select 
                            value={actionFilter}
                            onChange={setActionFilter}
                            style={{ width: '100%', marginTop: 8 }}
                            options={[
                                { value: 'all', label: 'All' },
                                { value: 'write', label: 'Write' },
                                { value: 'setting', label: 'Setting' },
                                { value: 'user', label: 'User' },
                            ]}
                        />
                    </Col>
                    <Col xs={24} md={4} lg={10} style={{ textAlign: 'right' }}>
                        <Space>
                            <Button type="primary" icon={<SearchOutlined />} onClick={fetchLogs} loading={loading}>
                                Search
                            </Button>
                            <Button icon={<DownloadOutlined />} onClick={handleExport}>
                                Export
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>
        </div>

        <div data-aos="fade-up" data-aos-delay="200">
            <Card title="Log Records">
                <Table 
                    columns={columns} 
                    dataSource={logs} 
                    rowKey="id"
                    loading={loading}
                    pagination={{ 
                        current: currentPage,
                        pageSize: pageSize,
                        total: logs.length,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} logs`,
                        onChange: (page, newPageSize) => {
                            setCurrentPage(page)
                            if (newPageSize !== pageSize) {
                                setPageSize(newPageSize)
                                setCurrentPage(1)
                            }
                        }
                    }}
                    scroll={{ x: 800 }}
                    size="middle" 
                />
            </Card>
        </div>
    </>
  )
}