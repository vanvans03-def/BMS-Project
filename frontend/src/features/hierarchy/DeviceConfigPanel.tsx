import { useState, useEffect, useCallback } from 'react'
import { Table, Switch, Button, Space, Tag, message, Typography, Card, Statistic } from 'antd'
import { LineChartOutlined, ReloadOutlined, ThunderboltOutlined, FolderOutlined, HddOutlined } from '@ant-design/icons'
import { authFetch } from '../../utils/authFetch'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import AOS from 'aos'

const { Title, Text } = Typography

interface DeviceConfigPanelProps {
    selectedLocation: any
    refreshTrigger?: number
    onNavigate: (system: 'BACNET' | 'MODBUS', deviceId: number) => void
    onSelectNode?: (node: any) => void
    showHistoryOnly?: boolean
}

export const DeviceConfigPanel = ({ selectedLocation, onNavigate, onSelectNode, showHistoryOnly = false }: DeviceConfigPanelProps) => {
    // Data States
    const [points, setPoints] = useState<any[]>([])
    const [devices, setDevices] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [messageApi, contextHolder] = message.useMessage()

    // Real-time Value Map
    const [realtimeValues, setRealtimeValues] = useState<Map<number, any>>(new Map())

    // 1. Determine Context
    const isPointView = selectedLocation?.isPoint === true
    const isDeviceView = selectedLocation?.type === 'Device'
    // Treat Gateways/Floors/Buildings as Folders
    const isFolderView = !isPointView && !isDeviceView && (selectedLocation?.type === 'Folder' || selectedLocation?.type === 'Building' || selectedLocation?.type === 'Floor' || selectedLocation?.type === 'Gateway')

    // 2. Fetch Data
    const fetchData = useCallback(async () => {
        if (!selectedLocation) return
        setLoading(true)
        try {
            if (isPointView) {
                // Point view: polling handles data
                // We could fetch fresh details if needed
            } else if (isFolderView) {
                // Fetch Devices in this Folder
                // Logic: Find devices whose `location_id` corresponds to a child of this location
                // Step A: Get Full Devices
                const resDev = await authFetch(`/devices`)
                const allDevs = await resDev.json()

                // Step B: Resolve Children
                // If selectedLocation has children populate (from Tree), use them
                let childLocIds: number[] = []
                if (selectedLocation.children && Array.isArray(selectedLocation.children)) {
                    childLocIds = selectedLocation.children.map((c: any) => c.key || c.id).map(Number)
                } else {
                    // Fallback: Fetch hierarchy to find children? Or filter by simple logic?
                    // Let's assume simplest case: Devices directly mapped to this location? (Rare for folders)
                    // Or Devices mapped to CHILDREN of this location.
                    // If we lack hierarchy data, we might miss some.
                    // Attempt: Fetch points-in-hierarchy to find children
                    try {
                        const hRes = await authFetch('/points/in-hierarchy')
                        const tree = await hRes.json()
                        // Helper to find node
                        const findNode = (nodes: any[]): any => {
                            for (const n of nodes) {
                                if (n.key == selectedLocation.key || n.id == selectedLocation.id) return n
                                if (n.children) {
                                    const found = findNode(n.children)
                                    if (found) return found
                                }
                            }
                            return null
                        }
                        const node = findNode(tree)
                        if (node && node.children) {
                            childLocIds = node.children.map((c: any) => Number(c.key || c.id))
                        }
                    } catch (e) { console.warn('Hierarchy fetch failed', e) }
                }

                // Filter Devices: 
                // 1. Directly in this location (if any)
                // 2. In child locations (Standard hierarchy)
                const inFolder = allDevs.filter((d: any) =>
                    d.location_id === selectedLocation.id ||
                    childLocIds.includes(d.location_id)
                )

                setDevices(inFolder)

            } else if (isDeviceView) {
                // Device View: Fetch Points
                const res = await authFetch(`/points/by-location/${selectedLocation.id}`)
                if (res.ok) {
                    const data = await res.json()
                    setPoints(data)
                }
            }
        } catch (err) {
            console.error(err)
            messageApi.error('Failed to load data')
        } finally {
            setLoading(false)
        }
    }, [selectedLocation, isPointView, isDeviceView, isFolderView])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // 3. Real-time Polling
    useEffect(() => {
        if (!selectedLocation) return

        const poll = async () => {
            try {
                let deviceIdToPoll = null

                if (isDeviceView) {
                    // Try to match Device ID from location
                    const devRes = await authFetch(`/devices?location_id=${selectedLocation.id}`)
                    const devs = await devRes.json()
                    if (devs.length > 0) deviceIdToPoll = devs[0].id

                } else if (isPointView) {
                    deviceIdToPoll = selectedLocation.device_id
                }

                if (deviceIdToPoll) {
                    const res = await authFetch('/monitor/read-device-points', {
                        method: 'POST', body: JSON.stringify({ deviceId: deviceIdToPoll })
                    })
                    const json = await res.json()
                    if (json.success && json.values) {
                        const map = new Map()
                        json.values.forEach((v: any) => map.set(v.pointId, v.value))
                        setRealtimeValues(map)
                    }
                }
            } catch (e) { }
        }

        const interval = setInterval(poll, 5000)
        if (isDeviceView || isPointView) poll()
        return () => clearInterval(interval)
    }, [selectedLocation, isDeviceView, isPointView])


    // Handler: Toggle Point History
    const toggleHistory = async (pointId: number, current: boolean) => {
        try {
            const res = await authFetch('/points/history', {
                method: 'POST',
                body: JSON.stringify({ pointId, enabled: !current })
            })
            if (res.ok) {
                messageApi.success(`History ${!current ? 'Enabled' : 'Disabled'}`)
                // Update Local State
                if (isDeviceView) {
                    setPoints(prev => prev.map(p => p.id === pointId ? { ...p, is_history_enabled: !current } : p))
                }
                // If isPointView, visual toggle handled by logic below via prop/refresh?
                // Ideally refresh data
                if (isPointView) {
                    // We can't easily update `selectedLocation` prop, but we can update a local override or just reload
                    // Since `selectedLocation` comes from tree, best to refresh or just assume success visually?
                    // Let's rely on Refresh button for full sync, but we can optimize later.
                }
            } else {
                messageApi.error('Failed to toggle history')
            }
        } catch { messageApi.error('Error') }
    }

    // --- RENDER: SINGLE POINT VIEW ---
    if (isPointView) {
        // Merge prop data with any realtime/updated data if possible. 
        // For now use selectedLocation as source of truth for static meta.
        const point = selectedLocation
        const val = realtimeValues.get(point.id)

        return (
            <div data-aos="fade-in">
                {contextHolder}
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <Title level={3} style={{ margin: 0 }}>{point.point_name || point.name}</Title>
                            <Text type="secondary">{point.object_type} {point.object_instance}</Text>
                        </div>
                        <Tag color="geekblue" style={{ fontSize: 14, padding: '4px 8px' }}>ID: {point.id}</Tag>
                    </div>

                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                        <Card style={{ flex: 1, minWidth: 200, textAlign: 'center' }}>
                            <Statistic
                                title="Real-time Value"
                                value={val !== undefined ? val : '-'}
                                precision={2}
                                valueStyle={{ color: '#3f8600' }}
                                prefix={<ThunderboltOutlined />}
                            />
                        </Card>
                        <Card style={{ flex: 1, minWidth: 200 }}>
                            <Statistic
                                title="History Status"
                                value={point.is_history_enabled ? 'Logging' : 'Disabled'}
                                valueStyle={{ color: point.is_history_enabled ? '#1890ff' : '#999' }}
                            />
                            <Switch
                                style={{ marginTop: 8 }}
                                checked={point.is_history_enabled}
                                onChange={() => toggleHistory(point.id, point.is_history_enabled)}
                                checkedChildren="On" unCheckedChildren="Off"
                            />
                        </Card>
                    </div>
                </Space>
            </div>
        )
    }

    // --- RENDER: FOLDER VIEW (Device List) ---
    if (isFolderView) {
        const devColumns = [
            {
                title: 'Device Name',
                dataIndex: 'device_name',
                key: 'name',
                render: (text: string, record: any) => (
                    <a onClick={() => {
                        // Navigate to Device View
                        if (onSelectNode && record.location_id) {
                            onSelectNode({
                                ...record,
                                id: record.location_id,
                                key: record.location_id,
                                name: record.device_name,
                                type: 'Device',
                                isPoint: false
                            })
                        }
                    }} style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HddOutlined /> {text}
                    </a>
                )
            },
            { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'online' ? 'success' : (s === 'failed' ? 'error' : 'default')}>{s || 'Unknown'}</Tag> },
            { title: 'Protocol', dataIndex: 'protocol', key: 'protocol', render: (p: string) => <Tag>{p}</Tag> },
            {
                title: 'Action',
                key: 'act',
                render: (_: any, r: any) => (
                    <Button size="small" onClick={() => onNavigate(r.protocol === 'MODBUS' ? 'MODBUS' : 'BACNET', r.id)}>Config Source</Button>
                )
            }
        ]

        return (
            <div data-aos="fade-in">
                {contextHolder}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                    <div>
                        <Title level={4} style={{ margin: 0 }}>
                            <FolderOutlined style={{ marginRight: 8 }} />
                            {selectedLocation.name}
                        </Title>
                        <Text type="secondary">Contains {devices.length} devices</Text>
                    </div>
                    <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
                </div>
                <Table
                    dataSource={devices}
                    columns={devColumns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    loading={loading}
                    locale={{ emptyText: 'No devices found in this folder' }}
                />
            </div>
        )
    }

    // --- RENDER: DEVICE VIEW (Point List) ---
    const columns = [
        {
            title: 'Point Name',
            dataIndex: 'point_name',
            key: 'name',
            render: (t: any, r: any) => (
                <a onClick={() => {
                    // Navigate to Point View
                    if (onSelectNode) {
                        onSelectNode({ ...r, isPoint: true, device_id: r.device_id || selectedLocation.id })
                    }
                }} style={{ fontWeight: 600 }}>{t}</a>
            )
        },
        { title: 'Address', dataIndex: 'object_instance', key: 'addr', render: (t: any, r: any) => <Tag>{r.object_type?.replace('OBJECT_', '') || ''} {t}</Tag> },
        {
            title: 'Value',
            key: 'val',
            render: (_: any, r: any) => {
                const val = realtimeValues.get(r.id)
                return val !== undefined ? <Tag color="green">{Number(val).toFixed(2)}</Tag> : <Tag>Wait...</Tag>
            }
        },
        {
            title: 'History',
            dataIndex: 'is_history_enabled',
            key: 'hist',
            width: 100,
            render: (val: boolean, r: any) => (
                <Switch size="small" checked={val} onChange={() => toggleHistory(r.id, val)} />
            )
        }
    ]

    const displayPoints = showHistoryOnly ? points.filter(p => p.is_history_enabled) : points

    return (
        <div data-aos="fade-in">
            {contextHolder}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>
                        <HddOutlined style={{ marginRight: 8 }} />
                        {selectedLocation.name}
                    </Title>
                    <Text type="secondary">Device Info • {displayPoints.length} Points</Text>
                </div>
                <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
            </div>

            <Table
                dataSource={displayPoints}
                columns={columns}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 10 }}
                loading={loading}
                locale={{ emptyText: 'No points found for this device' }}
            />
        </div>
    )
}
