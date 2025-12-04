// frontend/src/components/SettingsTabs.tsx
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import {
    Form, Input, InputNumber, Button, Card,
    Alert, Table, Space, Popconfirm, Statistic,
    Row, Col, message, Typography, Divider, Modal, Select, Spin, Tag, Drawer, Descriptions
} from 'antd'
import {
    SaveOutlined, ApiOutlined, DatabaseOutlined,
    PlusOutlined, GlobalOutlined, DeleteOutlined,
    UserOutlined, MailOutlined, EditOutlined
} from '@ant-design/icons'
import { authFetch } from '../utils/authFetch'
import AOS from 'aos'

const { Title, Text } = Typography
interface DatabaseSettingsProps {
    filterProtocol?: 'all' | 'BACNET' | 'MODBUS'
}

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
            const res = await authFetch('/settings')
            const data = await res.json()
            form.setFieldsValue(data)
        } catch (err) {
            console.error('Load Error:', err)
        }
    }

    const onFinish = async (values: any) => {
        setLoading(true)
        try {
            const res = await authFetch('/settings', {
                method: 'PUT',
                body: JSON.stringify(values)
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.message || 'Server error')
            }

            const result = await res.json()
            messageApi.success(result.message || 'Settings saved successfully')
        } catch (err: any) {
            messageApi.error(`Failed to save: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
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
                        <Button 
                            type="primary" 
                            htmlType="submit" 
                            icon={<SaveOutlined />} 
                            loading={loading}
                            block={window.innerWidth < 576}
                        >
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
            const res = await authFetch('/settings')
            const data = await res.json()
            form.setFieldsValue(data)
        } catch (err) {
            console.error('Load Error:', err)
        }
    }

    const onFinish = async (values: any) => {
        setLoading(true)
        try {
            const res = await authFetch('/settings', {
                method: 'PUT',
                body: JSON.stringify(values)
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.message || 'Update failed')
            }

            const result = await res.json()
            messageApi.success(result.message || 'Network settings saved')
        } catch (err: any) {
            messageApi.error(`Failed to save: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
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
                <Row gutter={[16, 24]}>
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
                                <Col xs={24} sm={12}>
                                    <Form.Item name="bacnet_port" label="UDP Port">
                                        <InputNumber style={{ width: '100%' }} placeholder="47808" />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
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
                    <Button 
                        type="primary" 
                        htmlType="submit" 
                        icon={<SaveOutlined />} 
                        loading={loading}
                        block={window.innerWidth < 576}
                    >
                        Save Network Configuration
                    </Button>
                </div>
            </Form>
        </Card>
    )
}

// ================================
// 3. USER SETTINGS (RESPONSIVE)
// ================================
export const UserSettings = () => {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [editingUser, setEditingUser] = useState<any>(null)
    const [form] = Form.useForm()
    const [messageApi, contextHolder] = message.useMessage()
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    useEffect(() => {
        AOS.refresh()
        loadUsers()
    }, [])

    const loadUsers = async () => {
        setLoading(true)
        try {
            const res = await authFetch('/users')
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
            is_active: user.is_active ? 'true' : 'false',
            password: ''
        })
        setIsModalOpen(true)
    }

    const handleDelete = async (id: number) => {
        try {
            const res = await authFetch(`/users/${id}`, { method: 'DELETE' })
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
            const url = editingUser ? `/users/${editingUser.id}` : '/users'
            const method = editingUser ? 'PUT' : 'POST'

            const { confirm_email, ...restValues } = values

            const payload = {
                ...restValues,
                is_active: values.is_active === 'true' || values.is_active === true
            }

            if (editingUser && !payload.password) {
                delete payload.password
            }

            const res = await authFetch(url, {
                method,
                body: JSON.stringify(payload)
            })

            const data = await res.json()

            if (res.ok || data.success || data.id || data.username) {
                messageApi.success(editingUser ? 'User updated' : 'User created')
                setIsModalOpen(false)
                form.resetFields()
                loadUsers()
            } else {
                const errorMsg = data.message || 'Operation failed'
                messageApi.error(errorMsg)
            }
        } catch (err) {
            console.error('Save user error:', err)
            messageApi.error('Failed to save user')
        } finally {
            setLoading(false)
        }
    }

    const formatLastLogin = (date: string) => {
        if (!date) return 'Never'
        const dateObj = new Date(date)
        const thaiTime = dateObj.toLocaleString('en-US', {
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        })
        return thaiTime
    }

    // Desktop columns
    const columns = [
        {
            title: 'Username',
            dataIndex: 'username',
            key: 'username',
            render: (text: string) => <Text strong>{text}</Text>,
            responsive: ['md'] as any
        },
        {
            title: 'User Info',
            key: 'userInfo',
            responsive: ['xs'] as any,
            render: (_: any, record: any) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{record.username}</Text>
                    <Space size={4}>
                        <Tag color={record.role === 'Admin' ? 'red' : 'geekblue'} style={{ margin: 0 }}>
                            {record.role}
                        </Tag>
                        <Tag color={record.is_active ? 'success' : 'default'} style={{ margin: 0 }}>
                            {record.is_active ? 'Active' : 'Inactive'}
                        </Tag>
                    </Space>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        {record.email || '-'}
                    </Text>
                </Space>
            )
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            responsive: ['md'] as any,
            render: (role: string) => (
                <Tag color={role === 'Admin' ? 'red' : 'geekblue'}>
                    {role}
                </Tag>
            )
        },
        {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'is_active',
            align: 'center' as const,
            responsive: ['md'] as any,
            render: (isActive: boolean) => (
                <Tag color={isActive ? 'success' : 'default'}>
                    {isActive ? 'Active' : 'Inactive'}
                </Tag>
            )
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            responsive: ['lg'] as any,
            render: (email: string) => email || <Text type="secondary">-</Text>
        },
        {
            title: 'Last Login',
            dataIndex: 'last_login',
            key: 'lastLogin',
            responsive: ['xl'] as any,
            render: (date: string) => <Text>{formatLastLogin(date)}</Text>
        },
        {
            title: 'Action',
            key: 'action',
            fixed: 'right' as const,
            width: window.innerWidth < 768 ? 80 : 150,
            render: (_: any, record: any) => (
                <Space size="small">
                    <Button
                        size="small"
                        onClick={() => handleEdit(record)}
                        icon={<EditOutlined />}
                    >
                        {window.innerWidth >= 768 && 'Edit'}
                    </Button>
                    <Popconfirm
                        title="Delete User"
                        description="Are you sure?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button size="small" danger icon={<DeleteOutlined />}>
                            {window.innerWidth >= 768 && 'Delete'}
                        </Button>
                    </Popconfirm>
                </Space>
            )
        }
    ]

    return (
        <Card
            title={<span style={{ fontSize: window.innerWidth < 768 ? '16px' : '20px' }}>User Management</span>}
            extra={
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                    size={window.innerWidth < 768 ? 'small' : 'middle'}
                >
                    {window.innerWidth >= 768 ? 'Add User' : 'Add'}
                </Button>
            }
        >
            {contextHolder}
            <Table
                dataSource={users}
                columns={columns}
                rowKey="id"
                loading={loading}
                size={window.innerWidth < 768 ? 'small' : 'middle'}
                scroll={{ x: 'max-content' }}
                pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    total: users.length,
                    showSizeChanger: true,
                    showQuickJumper: window.innerWidth >= 768,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    showTotal: (total, range) => 
                        window.innerWidth >= 768 
                            ? `${range[0]}-${range[1]} of ${total} users`
                            : `${range[0]}-${range[1]}/${total}`,
                    onChange: (page, newPageSize) => {
                        setCurrentPage(page)
                        if (newPageSize !== pageSize) {
                            setPageSize(newPageSize)
                            setCurrentPage(1)
                        }
                    },
                    simple: window.innerWidth < 576
                }}
            />

            <Modal
                title={editingUser ? 'Edit User' : 'Add New User'}
                open={isModalOpen}
                onCancel={() => {
                    setIsModalOpen(false)
                    form.resetFields()
                }}
                footer={null}
                destroyOnClose
                width={window.innerWidth < 768 ? '95%' : 520}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        name="username"
                        label="Username"
                        rules={[{ required: true }]}
                    >
                        <Input prefix={<UserOutlined />} disabled={!!editingUser} />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label={editingUser ? "New Password (optional)" : "Password"}
                        rules={[{ required: !editingUser }]}
                    >
                        <Input.Password />
                    </Form.Item>

                    <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                        <Select>
                            <Select.Option value="Admin">Admin</Select.Option>
                            <Select.Option value="Operator">Operator</Select.Option>
                            <Select.Option value="Viewer">Viewer</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { type: 'email', message: 'Invalid email' },
                            { required: true }
                        ]}
                    >
                        <Input prefix={<MailOutlined />} />
                    </Form.Item>

                    {!editingUser && (
                        <Form.Item
                            name="confirm_email"
                            label="Confirm Email"
                            dependencies={['email']}
                            rules={[
                                { required: true },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('email') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('Emails do not match'));
                                    },
                                }),
                            ]}
                        >
                            <Input prefix={<MailOutlined />} />
                        </Form.Item>
                    )}

                    {editingUser && (
                        <Form.Item name="is_active" label="Status">
                            <Select>
                                <Select.Option value="true">
                                    <Space><Tag color="success">Active</Tag></Space>
                                </Select.Option>
                                <Select.Option value="false">
                                    <Space><Tag color="default">Inactive</Tag></Space>
                                </Select.Option>
                            </Select>
                        </Form.Item>
                    )}

                    <Form.Item>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button onClick={() => {
                                setIsModalOpen(false)
                                form.resetFields()
                            }}>
                                Cancel
                            </Button>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                {editingUser ? 'Update' : 'Create'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    )
}

// ================================
// 4. DATABASE SETTINGS
// ================================
export const DatabaseSettings = ({ filterProtocol = 'all' }: DatabaseSettingsProps) => {
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
            const url = filterProtocol === 'all'
                ? '/database/stats'
                : `/database/stats?protocol=${filterProtocol}`

            const res = await authFetch(url)
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
            const res = await authFetch('/database/optimize', { method: 'POST' })
            const data = await res.json()
            if (data.success) {
                messageApi.success('Database optimized')
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
            const res = await authFetch('/database/clear-all', {
                method: 'POST',
                body: JSON.stringify({
                    confirmText,
                    protocol: filterProtocol === 'all' ? undefined : filterProtocol
                })
            })

            const data = await res.json()

            if (data.success) {
                messageApi.success('All data deleted')
                setIsModalOpen(false)
                setConfirmText('')
                loadStats()
            } else {
                messageApi.error(data.message || 'Failed')
            }
        } catch (err) {
            messageApi.error('Failed to clear data')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            {contextHolder}
            <div data-aos="fade-down">
                <Title level={5}>System Statistics</Title>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={12} md={6}>
                    <div data-aos="fade-up" data-aos-delay="100">
                        <Card size="small">
                            <Statistic
                                title="Total Devices"
                                value={stats.totalDevices || 0}
                                prefix={<ApiOutlined />}
                                valueStyle={{ fontSize: window.innerWidth < 768 ? '20px' : '24px' }}
                            />
                        </Card>
                    </div>
                </Col>
                <Col xs={12} sm={12} md={6}>
                    <div data-aos="fade-up" data-aos-delay="200">
                        <Card size="small">
                            <Statistic
                                title="Total Points"
                                value={stats.totalPoints || 0}
                                prefix={<DatabaseOutlined />}
                                valueStyle={{ fontSize: window.innerWidth < 768 ? '20px' : '24px' }}
                            />
                        </Card>
                    </div>
                </Col>
                <Col xs={12} sm={12} md={6}>
                    <div data-aos="fade-up" data-aos-delay="300">
                        <Card size="small">
                            <Statistic
                                title="Active Devices"
                                value={stats.activeDevices || 0}
                                valueStyle={{ 
                                    color: '#52c41a',
                                    fontSize: window.innerWidth < 768 ? '20px' : '24px'
                                }}
                            />
                        </Card>
                    </div>
                </Col>
                <Col xs={12} sm={12} md={6}>
                    <div data-aos="fade-up" data-aos-delay="400">
                        <Card size="small">
                            <Statistic
                                title="Database Size"
                                value={loading ? " " : (stats.databaseSize || 'N/A')}
                                formatter={(value) => loading ? <Spin size="small" /> : value}
                                valueStyle={{ fontSize: window.innerWidth < 768 ? '20px' : '24px' }}
                            />
                        </Card>
                    </div>
                </Col>
            </Row>

            <Divider />

            <div data-aos="fade-up" data-aos-delay="500">
                <Title level={5}>Maintenance</Title>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <Card size="small">
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Text strong>Optimize Database</Text>
                            <Button
                                icon={<ApiOutlined />}
                                onClick={handleOptimize}
                                loading={loading}
                                block={window.innerWidth < 576}
                            >
                                Optimize Now
                            </Button>
                        </Space>
                    </Card>
                </Space>
            </div>

            <Divider />

            <div data-aos="fade-up" data-aos-delay="600">
                <Title level={5} type="danger">Danger Zone</Title>
                <Alert
                    message={`Factory Reset (${filterProtocol === 'all' ? 'System Wide' : filterProtocol})`}
                    description={`Delete all ${filterProtocol === 'all' ? '' : filterProtocol} devices and points permanently`}
                    type="error"
                    showIcon
                    action={
                        <Button
                            danger
                            type="primary"
                            icon={<DeleteOutlined />}
                            onClick={() => setIsModalOpen(true)}
                            disabled={loading}
                            size={window.innerWidth < 768 ? 'small' : 'middle'}
                            block={window.innerWidth < 576}
                            style={{ marginTop: window.innerWidth < 576 ? 8 : 0 }}
                        >
                            Clear All
                        </Button>
                    }
                />
            </div>

            <Modal
                title="⚠️ Factory Reset"
                open={isModalOpen}
                onCancel={() => {
                    setIsModalOpen(false)
                    setConfirmText('')
                }}
                footer={null}
                width={window.innerWidth < 768 ? '95%' : 520}
            >
                <Alert
                    message="Cannot be undone!"
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                <Form onFinish={handleFactoryReset}>
                    <Form.Item label="Type DELETE ALL DATA">
                        <Input
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="DELETE ALL DATA"
                        />
                    </Form.Item>

                    <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                        <Button onClick={() => {
                            setIsModalOpen(false)
                            setConfirmText('')
                        }}>
                            Cancel
                        </Button>
                        <Button
                            danger
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            disabled={confirmText !== 'DELETE ALL DATA'}
                        >
                            Confirm Delete
                        </Button>
                    </Space>
                </Form>
            </Modal>
        </Card>
    )
}