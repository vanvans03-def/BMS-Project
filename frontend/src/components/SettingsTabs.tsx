/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import {
    Form, Input, InputNumber, Button, Card,
    Alert, Table, Space, Popconfirm, Statistic,
    Row, Col, message, Typography, Divider
} from 'antd'
import {
    SaveOutlined, ApiOutlined, DatabaseOutlined,
    PlusOutlined, GlobalOutlined, DeleteOutlined,
    UserOutlined
} from '@ant-design/icons'
import { config } from '../config'
import AOS from 'aos'

const { Title, Text } = Typography

// --- 1. General Settings ---
export const GeneralSettings = () => {
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [messageApi, contextHolder] = message.useMessage() // ใช้ message hook

    useEffect(() => {
        AOS.refresh()
        // โหลดค่าเริ่มต้น
        fetch(`${config.apiUrl}/settings`)
            .then(res => res.json())
            .then(data => {
                console.log('General Settings Loaded:', data)
                form.setFieldsValue(data)
            })
            .catch(err => console.error('Load Error:', err))
    }, [form])

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

// --- 2. Network Settings ---
export const NetworkSettings = () => {
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [messageApi, contextHolder] = message.useMessage()

    useEffect(() => {
        AOS.refresh()
        fetch(`${config.apiUrl}/settings`)
            .then(res => res.json())
            .then(data => {
                console.log('Network Settings Loaded:', data)
                form.setFieldsValue(data)
            })
            .catch(console.error)
    }, [form])

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

// --- 3. User Settings (UI Only) ---
export const UserSettings = () => {
    useEffect(() => { AOS.refresh() }, [])
    const users = [
        { id: 1, username: 'admin', role: 'Admin', lastLogin: '2025-11-25 10:00', status: 'Active' },
        { id: 2, username: 'operator', role: 'Operator', lastLogin: '2025-11-24 15:30', status: 'Active' }
    ]
    const columns = [
        { title: 'Username', dataIndex: 'username', key: 'username' },
        { title: 'Role', dataIndex: 'role', key: 'role', render: (role: string) => <Text strong>{role}</Text> },
        { title: 'Last Login', dataIndex: 'lastLogin', key: 'lastLogin', responsive: ['md'] as any },
        { title: 'Action', key: 'action', render: () => <Space><Button size="small">Edit</Button><Button size="small" danger>Delete</Button></Space> }
    ]
    return (
        <Card bordered={false} title="User Management" extra={<Button type="primary" icon={<PlusOutlined />} data-aos="fade-left">Add User</Button>}>
            <div data-aos="fade-up">
                <Table dataSource={users} columns={columns} rowKey="id" pagination={false} scroll={{ x: 600 }} />
            </div>
        </Card>
    )
}

// --- 4. Database Settings (UI Only) ---
export const DatabaseSettings = () => {
    useEffect(() => { AOS.refresh() }, [])
    return (
        <Card bordered={false}>
            <div data-aos="fade-up">
                <Title level={5}>System Statistics</Title>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12}><div data-aos="flip-left"><Card size="small"><Statistic title="Total Devices" value={0} prefix={<ApiOutlined />} suffix="Units" /></Card></div></Col>
                    <Col xs={24} sm={12}><div data-aos="flip-right"><Card size="small"><Statistic title="Total Points" value={0} prefix={<DatabaseOutlined />} suffix="Points" /></Card></div></Col>
                </Row>
            </div>
            <Divider />
            <div data-aos="fade-up" data-aos-delay="200">
                <Title level={5} type="danger">Danger Zone</Title>
                <Alert message="Factory Reset" description="This action will delete all data." type="error" showIcon action={<Popconfirm title="Are you sure?" okText="Yes, Delete" cancelText="No"><Button danger type="primary" icon={<DeleteOutlined />}>Clear All Data</Button></Popconfirm>} />
            </div>
        </Card>
    )
}