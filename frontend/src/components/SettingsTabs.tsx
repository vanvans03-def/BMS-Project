/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import {
    Form, Input, InputNumber, Button, Card,
    Alert, Table, Space, Popconfirm, Statistic,
    Row, Col, message, Typography, Divider, Modal, Select
} from 'antd'
import {
    SaveOutlined, ApiOutlined, DatabaseOutlined,
    PlusOutlined, GlobalOutlined, DeleteOutlined,
    UserOutlined
} from '@ant-design/icons'
import { config } from '../config'
import AOS from 'aos'

const { Title, Text } = Typography

// ================================
// 1. GENERAL SETTINGS
// ================================
export const GeneralSettings = () => {
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [messageApi, contextHolder] = message.useMessage()

    useEffect(() => {
        AOS.refresh()
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const res = await fetch(`${config.apiUrl}/settings`)
            const data = await res.json()
            console.log('General Settings Loaded:', data)
            form.setFieldsValue(data)
        } catch (err) {
            console.error('Load Error:', err)
        }
    }

    const onFinish = async (values: any) => {
        console.log('Saving General Settings:', values)
        setLoading(true)
        try {
            const res = await fetch(`${config.apiUrl}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            })
            
            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.message || 'Server error')
            }
            
            const result = await res.json()
            messageApi.success(result.message || 'Settings saved successfully')
        } catch (err: any) {
            console.error(err)
            messageApi.error(`Failed to save: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card bordered={false}>
            {contextHolder}
            <div data-aos="fade-up">
                <Form 
                    form={form} 
                    layout="vertical" 
                    onFinish={onFinish}
                    initialValues={{ site_name: '', description: '', contact_info: '' }}
                >
                    <div data-aos="fade-up" data-aos-delay="100">
                        <Title level={5}><GlobalOutlined /> Site Information</Title>
                        <Form.Item 
                            name="site_name" 
                            label="Site Name" 
                            rules={[{ required: true, message: 'Please enter site name' }]}
                        >
                            <Input placeholder="Project Name e.g. Building A" />
                        </Form.Item>
                    </div>
                    
                    <div data-aos="fade-up" data-aos-delay="150">
                        <Form.Item name="description" label="Description">
                            <Input.TextArea rows={5} placeholder="Site details, location, notes..." />
                        </Form.Item>
                    </div>
                    
                    <div data-aos="fade-up" data-aos-delay="200">
                        <Form.Item name="contact_info" label="Contact Info">
                            <Input prefix={<UserOutlined />} placeholder="Admin Email / Phone" />
                        </Form.Item>
                    </div>
                    
                    <Divider />
                    
                    <div data-aos="fade-up" data-aos-delay="250">
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                            Save Changes
                        </Button>
                    </div>
                </Form>
            </div>
        </Card>
    )
}

// ================================
// 2. NETWORK SETTINGS
// ================================
export const NetworkSettings = () => {
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [messageApi, contextHolder] = message.useMessage()

    useEffect(() => {
        AOS.refresh()
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const res = await fetch(`${config.apiUrl}/settings`)
            const data = await res.json()
            console.log('Network Settings Loaded:', data)
            form.setFieldsValue(data)
        } catch (err) {
            console.error('Load Error:', err)
        }
    }

    const onFinish = async (values: any) => {
        console.log('Saving Network Settings:', values)
        setLoading(true)
        try {
            const res = await fetch(`${config.apiUrl}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.message || 'Update failed')
            }
            
            const result = await res.json()
            messageApi.success(result.message || 'Network settings saved. Please restart backend to apply.')
        } catch (err: any) {
             messageApi.error(`Failed to save: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card bordered={false}>
            {contextHolder}
            <div data-aos="fade-up">
                <Alert
                    message="Restart Required"
                    description="Changing Device ID or Port requires a backend restart."
                    type="warning"
                    showIcon
                    style={{ marginBottom: 24 }}
                />
            </div>

            <Form form={form} layout="vertical" onFinish={onFinish}>
                <Row gutter={24}>
                    <Col xs={24} lg={12}>
                        <div data-aos="fade-right" data-aos-delay="100">
                            <Title level={5}><ApiOutlined /> Local Device Identity</Title>
                            <Card size="small" style={{ background: '#fafafa' }}>
                                <Form.Item 
                                    name="bacnet_device_id" 
                                    label="Device Instance ID" 
                                    extra="Must be unique in the network" 
                                    rules={[{ required: true, message: 'Device ID is required' }]}
                                >
                                    <InputNumber style={{ width: '100%' }} min={0} max={4194303} />
                                </Form.Item>
                            </Card>
                        </div>
                    </Col>

                    <Col xs={24} lg={12}>
                        <div data-aos="fade-left" data-aos-delay="100">
                            <Title level={5}><GlobalOutlined /> Communication</Title>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="bacnet_port" label="UDP Port">
                                        <InputNumber style={{ width: '100%' }} placeholder="47808" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="discovery_timeout" label="Timeout (ms)">
                                        <InputNumber style={{ width: '100%' }} step={1000} />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Form.Item name="polling_interval" label="Polling Interval (ms)" extra="Auto-refresh rate">
                                <InputNumber style={{ width: '100%' }} step={1000} min={1000} />
                            </Form.Item>
                        </div>
                    </Col>
                </Row>

                <Divider />
                
                <div data-aos="fade-up" data-aos-delay="200">
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                        Save Network Configuration
                    </Button>
                </div>
            </Form>
        </Card>
    )
}

// ================================
// 3. USER SETTINGS (Connected)
// ================================
export const UserSettings = () => {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<any>(null)
    const [form] = Form.useForm()
    const [messageApi, contextHolder] = message.useMessage()

    useEffect(() => { 
        AOS.refresh()
        loadUsers()
    }, [])

    const loadUsers = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${config.apiUrl}/users`)
            const data = await res.json()
            setUsers(Array.isArray(data) ? data : [])
        } catch (err) {
            messageApi.error('Failed to load users')
        } finally {
            setLoading(false)
        }
    }

    const handleAdd = () => {
        setEditingUser(null)
        form.resetFields()
        setIsModalOpen(true)
    }

    const handleEdit = (user: any) => {
        setEditingUser(user)
        form.setFieldsValue({
            ...user,
            is_active: user.is_active ? 'true' : 'false'
        })
        setIsModalOpen(true)
    }

    const handleDelete = async (id: number) => {
        try {
            const res = await fetch(`${config.apiUrl}/users/${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                messageApi.success('User deleted successfully')
                loadUsers()
            } else {
                messageApi.error('Failed to delete user')
            }
        } catch (err) {
            messageApi.error('Delete failed')
        }
    }

    const handleSubmit = async (values: any) => {
        setLoading(true)
        try {
            const url = editingUser 
                ? `${config.apiUrl}/users/${editingUser.id}` 
                : `${config.apiUrl}/users`
            
            const method = editingUser ? 'PUT' : 'POST'
            
            // แปลง is_active จาก string เป็น boolean
            const payload = {
                ...values,
                is_active: values.is_active === 'true' || values.is_active === true
            }
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()
            
            if (data.success) {
                messageApi.success(editingUser ? 'User updated' : 'User created')
                setIsModalOpen(false)
                form.resetFields()
                loadUsers()
            } else {
                messageApi.error('Operation failed')
            }
        } catch (err) {
            messageApi.error('Failed to save user')
        } finally {
            setLoading(false)
        }
    }

    const columns = [
        { 
            title: 'Username', 
            dataIndex: 'username', 
            key: 'username',
            render: (text: string) => <Text strong>{text}</Text>
        },
        { 
            title: 'Role', 
            dataIndex: 'role', 
            key: 'role', 
            render: (role: string) => (
                <Text strong style={{ color: role === 'Admin' ? '#f5222d' : '#1890ff' }}>
                    {role}
                </Text>
            ) 
        },
        { 
            title: 'Email', 
            dataIndex: 'email', 
            key: 'email',
            responsive: ['md'] as any,
            render: (email: string) => email || '-'
        },
        { 
            title: 'Last Login', 
            dataIndex: 'last_login', 
            key: 'lastLogin', 
            responsive: ['lg'] as any,
            render: (date: string) => date ? new Date(date).toLocaleString('th-TH') : 'Never'
        },
        { 
            title: 'Action', 
            key: 'action',
            width: 150,
            render: (_: any, record: any) => (
                <Space>
                    <Button size="small" onClick={() => handleEdit(record)}>Edit</Button>
                    <Popconfirm 
                        title="Delete User" 
                        description="Are you sure you want to delete this user?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button size="small" danger>Delete</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ]

    return (
        <Card 
            bordered={false} 
            title="User Management" 
            extra={
                <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={handleAdd}
                    data-aos="fade-left"
                >
                    Add User
                </Button>
            }
        >
            {contextHolder}
            <div data-aos="fade-up">
                <Table 
                    dataSource={users} 
                    columns={columns} 
                    rowKey="id" 
                    loading={loading}
                    pagination={{ 
                        defaultPageSize: 10,
                        pageSizeOptions: ['10', '20', '50'],
                        showSizeChanger: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`
                    }}
                    scroll={{ x: 600 }} 
                />
            </div>

            {/* Modal สำหรับเพิ่ม/แก้ไข User */}
            <Modal
                title={editingUser ? 'Edit User' : 'Add New User'}
                open={isModalOpen}
                onCancel={() => {
                    setIsModalOpen(false)
                    form.resetFields()
                }}
                footer={null}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item 
                        name="username" 
                        label="Username" 
                        rules={[{ required: true, message: 'Please enter username' }]}
                    >
                        <Input prefix={<UserOutlined />} disabled={!!editingUser} />
                    </Form.Item>

                    {!editingUser && (
                        <Form.Item 
                            name="password" 
                            label="Password" 
                            rules={[{ required: true, message: 'Please enter password' }]}
                        >
                            <Input.Password />
                        </Form.Item>
                    )}

                    <Form.Item 
                        name="role" 
                        label="Role" 
                        rules={[{ required: true, message: 'Please select role' }]}
                    >
                        <Select>
                            <Select.Option value="Admin">Admin</Select.Option>
                            <Select.Option value="Operator">Operator</Select.Option>
                            <Select.Option value="Viewer">Viewer</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="email" label="Email">
                        <Input type="email" />
                    </Form.Item>

                    {editingUser && (
                        <Form.Item name="is_active" label="Status">
                            <Select>
                                <Select.Option value="true">Active</Select.Option>
                                <Select.Option value="false">Inactive</Select.Option>
                            </Select>
                        </Form.Item>
                    )}

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                {editingUser ? 'Update' : 'Create'}
                            </Button>
                            <Button onClick={() => {
                                setIsModalOpen(false)
                                form.resetFields()
                            }}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    )
}

// ================================
// 4. DATABASE SETTINGS (Connected)
// ================================
export const DatabaseSettings = () => {
    const [stats, setStats] = useState<any>({})
    const [loading, setLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [confirmText, setConfirmText] = useState('')
    const [messageApi, contextHolder] = message.useMessage()

    useEffect(() => { 
        AOS.refresh()
        loadStats()
    }, [])

    const loadStats = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${config.apiUrl}/database/stats`)
            const data = await res.json()
            setStats(data)
        } catch (err) {
            messageApi.error('Failed to load statistics')
        } finally {
            setLoading(false)
        }
    }

    const handleOptimize = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${config.apiUrl}/database/optimize`, { method: 'POST' })
            const data = await res.json()
            if (data.success) {
                messageApi.success('Database optimized successfully')
            }
        } catch (err) {
            messageApi.error('Optimization failed')
        } finally {
            setLoading(false)
        }
    }

    const handleFactoryReset = async () => {
        if (confirmText !== 'DELETE ALL DATA') {
            messageApi.error('Confirmation text does not match')
            return
        }

        setLoading(true)
        try {
            const res = await fetch(`${config.apiUrl}/database/clear-all`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmText })
            })

            const data = await res.json()
            
            if (data.success) {
                messageApi.success('All data has been deleted')
                setIsModalOpen(false)
                setConfirmText('')
                loadStats()
            } else {
                messageApi.error(data.message || 'Operation failed')
            }
        } catch (err) {
            messageApi.error('Failed to clear data')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card bordered={false}>
            {contextHolder}
            <div data-aos="fade-up">
                <Title level={5}>System Statistics</Title>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} md={6}>
                        <div data-aos="flip-left">
                            <Card size="small">
                                <Statistic 
                                    title="Total Devices" 
                                    value={stats.totalDevices || 0} 
                                    prefix={<ApiOutlined />} 
                                    suffix="Units" 
                                />
                            </Card>
                        </div>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <div data-aos="flip-right">
                            <Card size="small">
                                <Statistic 
                                    title="Total Points" 
                                    value={stats.totalPoints || 0} 
                                    prefix={<DatabaseOutlined />} 
                                    suffix="Points" 
                                />
                            </Card>
                        </div>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <div data-aos="flip-left" data-aos-delay="100">
                            <Card size="small">
                                <Statistic 
                                    title="Active Devices" 
                                    value={stats.activeDevices || 0} 
                                    prefix={<ApiOutlined />}
                                    valueStyle={{ color: '#52c41a' }}
                                />
                            </Card>
                        </div>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <div data-aos="flip-right" data-aos-delay="100">
                            <Card size="small">
                                <Statistic 
                                    title="Database Size" 
                                    value={stats.databaseSize || 'N/A'} 
                                    prefix={<DatabaseOutlined />}
                                />
                            </Card>
                        </div>
                    </Col>
                </Row>
            </div>

            <Divider />

            <div data-aos="fade-up" data-aos-delay="100">
                <Title level={5}>Database Maintenance</Title>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <Card size="small">
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Text strong>Optimize Database</Text>
                            <Text type="secondary">
                                Run VACUUM ANALYZE to optimize database performance
                            </Text>
                            <Button 
                                icon={<ApiOutlined />} 
                                onClick={handleOptimize}
                                loading={loading}
                            >
                                Optimize Now
                            </Button>
                        </Space>
                    </Card>

                    <Card size="small">
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Text strong>Backup Information</Text>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Text type="secondary">Last Backup:</Text>
                                    <br />
                                    <Text>
                                        {stats.lastBackup 
                                            ? new Date(stats.lastBackup).toLocaleString('th-TH') 
                                            : 'Never'}
                                    </Text>
                                </Col>
                                <Col span={12}>
                                    <Text type="secondary">Size:</Text>
                                    <br />
                                    <Text>{stats.databaseSize || 'N/A'}</Text>
                                </Col>
                            </Row>
                        </Space>
                    </Card>
                </Space>
            </div>

            <Divider />

            <div data-aos="fade-up" data-aos-delay="200">
                <Title level={5} type="danger">Danger Zone</Title>
                <Alert 
                    message="Factory Reset" 
                    description="This action will permanently delete all devices, points, and settings. Users will not be affected." 
                    type="error" 
                    showIcon 
                    action={
                        <Button 
                            danger 
                            type="primary" 
                            icon={<DeleteOutlined />}
                            onClick={() => setIsModalOpen(true)}
                        >
                            Clear All Data
                        </Button>
                    } 
                />
            </div>

            {/* Confirmation Modal */}
            <Modal
                title="⚠️ Factory Reset Confirmation"
                open={isModalOpen}
                onCancel={() => {
                    setIsModalOpen(false)
                    setConfirmText('')
                }}
                footer={null}
                destroyOnClose
            >
                <Alert
                    message="This action cannot be undone!"
                    description="All devices, points, and settings will be permanently deleted. Please type DELETE ALL DATA to confirm."
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                <Form layout="vertical" onFinish={handleFactoryReset}>
                    <Form.Item 
                        label="Type DELETE ALL DATA to confirm"
                        required
                    >
                        <Input
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="DELETE ALL DATA"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button 
                                danger 
                                type="primary" 
                                htmlType="submit"
                                loading={loading}
                                disabled={confirmText !== 'DELETE ALL DATA'}
                            >
                                Confirm Delete
                            </Button>
                            <Button onClick={() => {
                                setIsModalOpen(false)
                                setConfirmText('')
                            }}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    )
}