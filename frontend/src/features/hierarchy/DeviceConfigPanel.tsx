import { useState, useEffect } from 'react'
import { Table, Switch, Form, Input, Button, Drawer, Space, Tag, message, Select } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { authFetch } from '../../utils/authFetch'

import AOS from 'aos'

interface DeviceConfigPanelProps {
    selectedLocation: any
    refreshTrigger?: number // To reload when device added to loc
    onNavigate: (system: 'BACNET' | 'MODBUS', deviceId: number) => void
    showHistoryOnly?: boolean // [NEW]
}

export const DeviceConfigPanel = ({ selectedLocation, refreshTrigger, onNavigate, showHistoryOnly = false }: DeviceConfigPanelProps) => {
    const [devices, setDevices] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [editingDevice, setEditingDevice] = useState<any>(null)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [form] = Form.useForm()
    const [messageApi, contextHolder] = message.useMessage()

    useEffect(() => {
        AOS.refresh()
    }, [devices])

    const fetchDevicesInLocation = async () => {
        if (!selectedLocation) {
            setDevices([])
            return
        }
        setLoading(true)
        try {
            const res = await authFetch('/devices')
            const all = await res.json()
            const inLoc = all.filter((d: any) => d.location_id === selectedLocation.id)
            setDevices(inLoc)
        } catch {
            messageApi.error('Failed to load devices')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDevicesInLocation()
    }, [selectedLocation, refreshTrigger, editingDevice]) // Reload when location changes or finished editing

    const handleEdit = (record: any) => {
        setEditingDevice(record)
        form.setFieldsValue(record)
        setIsDrawerOpen(true)
    }

    const handleSave = async (values: any) => {
        try {
            const payload = {
                ...values,
                polling_interval: values.polling_interval ? Number(values.polling_interval) : null
            }
            const res = await authFetch(`/devices/${editingDevice.id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            })
            if (res.ok) {
                messageApi.success('Updated')
                setIsDrawerOpen(false)
                setEditingDevice(null) // trigger reload
            } else {
                messageApi.error('Failed to update')
            }
        } catch {
            messageApi.error('Error updating')
        }
    }

    // Quick Toggle History
    const toggleHistory = async (id: number, current: boolean) => {
        try {
            const res = await authFetch(`/devices/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ is_history_enabled: !current })
            })
            if (res.ok) {
                messageApi.success(`History ${!current ? 'Enabled' : 'Disabled'}`)
                fetchDevicesInLocation()
            }
        } catch { messageApi.error('Error') }
    }

    // Unassign (Remove from folder)
    const unassignDevice = async (id: number) => {
        try {
            const res = await authFetch(`/devices/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ location_id: null })
            })
            if (res.ok) {
                messageApi.success('Device removed from location')
                fetchDevicesInLocation()
            }
        } catch { messageApi.error('Error') }
    }

    const columns = [
        { title: 'Name', dataIndex: 'device_name', key: 'name' },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                let color = 'default'
                let text = 'Offline'

                if (status === 'online') {
                    color = 'success'
                    text = 'Online'
                } else if (status === 'failed') {
                    color = 'error'
                    text = 'Failed'
                }

                return <Tag color={color}>{text}</Tag>
            }
        },
        {
            title: 'Last Seen',
            dataIndex: 'last_seen',
            key: 'last_seen',
            render: (val: string) => val ? new Date(val).toLocaleString() : '-'
        },
        { title: 'Protocol', dataIndex: 'protocol', key: 'protocol', render: (t: string) => <Tag>{t}</Tag> },
        {
            title: 'Interval (ms)',
            dataIndex: 'polling_interval',
            key: 'interval',
            render: (val: number) => <Tag>{val || 60000} ms</Tag>
        },
        {
            title: 'History', dataIndex: 'is_history_enabled', key: 'history', render: (val: boolean, r: any) => (
                <Switch size="small" checked={val} onChange={() => toggleHistory(r.id, val)} />
            )
        },
        {
            title: 'Action', key: 'action', render: (_: any, r: any) => (
                <Space>
                    <Button
                        size="small"
                        type="primary"
                        ghost
                        onClick={() => onNavigate(r.protocol === 'MODBUS' ? 'MODBUS' : 'BACNET', r.id)}
                    >
                        Monitor
                    </Button>
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
                    <Button size="small" danger onClick={() => unassignDevice(r.id)}>Remove</Button>
                </Space>
            )
        }
    ]

    const filteredDevices = devices.filter(d => !showHistoryOnly || d.is_history_enabled)

    if (!selectedLocation) return <div style={{ textAlign: 'center', marginTop: 40, color: '#999' }}>Select a location to view devices</div>

    return (
        <div data-aos="fade-in" data-aos-duration="600">
            {contextHolder}
            <Table
                dataSource={filteredDevices}
                columns={columns}
                rowKey="id"
                size="small"
                pagination={false}
                loading={loading}
            />

            <Drawer
                title="Device Configuration"
                placement="right"
                onClose={() => setIsDrawerOpen(false)}
                open={isDrawerOpen}
                width={400}
                extra={
                    <Space>
                        <Button onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
                        <Button type="primary" onClick={form.submit}>Save</Button>
                    </Space>
                }
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="device_name" label="Device Name"><Input /></Form.Item>

                    <Form.Item name="polling_interval" label="Polling Interval (ms)" initialValue={60000}>
                        <Input type="number" step={100} />
                    </Form.Item>

                    <Form.Item name="is_history_enabled" valuePropName="checked" label="History Logging">
                        <Switch />
                    </Form.Item>

                    <Form.Item name="logging_type" label="Logging Mode" initialValue="COV">
                        <Select>
                            <Select.Option value="COV">COV (Change of Value)</Select.Option>
                            <Select.Option value="INTERVAL">Interval (Forced)</Select.Option>
                        </Select>
                    </Form.Item>


                </Form>
            </Drawer>
        </div>
    )
}
