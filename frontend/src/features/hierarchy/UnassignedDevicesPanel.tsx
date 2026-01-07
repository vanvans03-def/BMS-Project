import { useState, useEffect } from 'react'
import { List, Card, Button, Typography, Tag, message, Radio } from 'antd'
import type { RadioChangeEvent } from 'antd'
import { ImportOutlined, ReloadOutlined } from '@ant-design/icons'
import { authFetch } from '../../utils/authFetch'

const { Text } = Typography

interface UnassignedDevicesPanelProps {
    selectedLocation: any
    onAssignSuccess?: () => void
}

export const UnassignedDevicesPanel = ({ selectedLocation, onAssignSuccess }: UnassignedDevicesPanelProps) => {
    const [devices, setDevices] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [messageApi, contextHolder] = message.useMessage()

    const fetchUnassigned = async () => {
        setLoading(true)
        try {
            const res = await authFetch('/devices')
            const allDevices = await res.json()
            // Filter where location_id is null
            const unassigned = allDevices.filter((d: any) => !d.location_id)
            setDevices(unassigned)
        } catch {
            messageApi.error('Failed to load devices')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUnassigned()
    }, [onAssignSuccess]) // Refresh when something is assigned

    const handleAssign = async (deviceId: number) => {
        if (!selectedLocation) {
            messageApi.warning('Please select a location in the tree first')
            return
        }

        try {
            const res = await authFetch(`/devices/${deviceId}`, {
                method: 'PUT',
                body: JSON.stringify({ location_id: selectedLocation.id })
            })
            if (res.ok) {
                messageApi.success('Assigned')
                fetchUnassigned()
                if (onAssignSuccess) onAssignSuccess() // Trigger parent refresh if needed
            } else {
                messageApi.error('Failed to assign')
            }
        } catch {
            messageApi.error('Error assigning')
        }
    }

    const [filter, setFilter] = useState<'ALL' | 'BACNET' | 'MODBUS'>('ALL')

    const filteredDevices = devices.filter(d => {
        if (filter === 'ALL') return true
        return d.protocol === filter
    })

    return (
        <div style={{ padding: '0 8px 24px 8px', height: '100%', overflowY: 'auto' }}>
            {contextHolder}
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Radio.Group
                    value={filter}
                    onChange={(e: RadioChangeEvent) => setFilter(e.target.value)}
                    size="small"
                    optionType="button"
                    buttonStyle="solid"
                >
                    <Radio.Button value="ALL">All</Radio.Button>
                    <Radio.Button value="BACNET">BACnet</Radio.Button>
                    <Radio.Button value="MODBUS">Modbus</Radio.Button>
                </Radio.Group>
                <Button type="text" icon={<ReloadOutlined />} onClick={fetchUnassigned} />
            </div>
            <List
                loading={loading}
                dataSource={filteredDevices}
                renderItem={item => (
                    <Card size="small" style={{ marginBottom: 8 }} hoverable>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <Text strong style={{ display: 'block' }}>{item.device_name}</Text>
                                <Tag color={item.protocol === 'BACNET' ? 'blue' : 'orange'}>{item.protocol}</Tag>
                                <Text type="secondary" style={{ fontSize: 12 }}>ID: {item.device_instance_id}</Text>
                            </div>
                            <Button
                                type="primary"
                                size="small"
                                icon={<ImportOutlined />}
                                disabled={!selectedLocation}
                                onClick={() => handleAssign(item.id)}
                            />
                        </div>
                    </Card>
                )}
            />
        </div>
    )
}

