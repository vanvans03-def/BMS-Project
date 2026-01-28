import { useState, useEffect, useMemo } from 'react'
import { Tree, Button, Dropdown, Modal, Form, Input, Select, message } from 'antd'
import {
    PlusOutlined, FolderOutlined, HomeOutlined,
    AppstoreOutlined, DeleteOutlined, EditOutlined, MoreOutlined,
    ThunderboltOutlined, LineChartOutlined, HddOutlined
} from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import { authFetch } from '../../utils/authFetch'

interface LocationTreePanelProps {
    onSelectLocation: (node: any) => void
    showHistoryOnly?: boolean // [NEW]
}

export const LocationTreePanel = ({ onSelectLocation, showHistoryOnly = false }: LocationTreePanelProps) => {
    // treeData and getValidNodes removed/unused
    const [locations, setLocations] = useState<any[]>([])
    const [points, setPoints] = useState<any[]>([]) // [NEW]
    const [historyLocationIds, setHistoryLocationIds] = useState<Set<number>>(new Set())
    const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([])
    const [autoExpandParent, setAutoExpandParent] = useState(true)

    const [messageApi, contextHolder] = message.useMessage()

    // Add/Edit Modal
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingNode, setEditingNode] = useState<any>(null)
    const [parentForAdd, setParentForAdd] = useState<number | null>(null)
    const [form] = Form.useForm()

    const fetchLocationsAndDevices = async () => {
        try {
            // 1. Fetch Locations
            const locRes = await authFetch('/locations')
            const locData = await locRes.json()
            setLocations(locData)

            const allKeys = locData.map((d: any) => String(d.id))
            setExpandedKeys(allKeys)

            // 2. Fetch Devices (Only for mapping)
            const devRes = await authFetch('/devices')
            const devData = await devRes.json()

            // 3. [NEW] Fetch Points in Hierarchy
            const pointRes = await authFetch('/points/in-hierarchy')
            const pointData = await pointRes.json()
            setPoints(pointData)

            // 4. Identify Locations with History Devices/Points
            const locsWithHistory = new Set<number>()
            devData.forEach((d: any) => {
                if (d.location_id && d.is_history_enabled) {
                    locsWithHistory.add(d.location_id)
                }
            })
            // Union with points history
            pointData.forEach((p: any) => {
                if (p.location_id && p.is_history_enabled) {
                    locsWithHistory.add(p.location_id)
                }
            })
            setHistoryLocationIds(locsWithHistory)

        } catch (err) {
            messageApi.error('Failed to load hierarchy data')
        }
    }

    useEffect(() => {
        fetchLocationsAndDevices()
    }, [])

    // [RESTORED] Active History Path IDs
    const activeHistoryPathIds = useMemo(() => {
        const ids = new Set<number>()
        const traverse = (nodes: any[]) => {
            for (const node of nodes) {
                // If this is a location with history, add it
                if (historyLocationIds.has(node.id)) {
                    ids.add(node.id)
                    // Add all parents up to root?
                    // For now, simpler: just track which nodes are "active"
                }
            }
        }
        // Ideally we walk the tree. But with flat list, we can just use historyLocationIds
        return historyLocationIds
    }, [historyLocationIds])

    // Memoized Tree Builder 
    const treeDataNodes = useMemo(() => {
        const map: any = {}
        const roots: any[] = []

        // 1. Create Nodes (Locations)
        locations.forEach((node) => {
            const key = String(node.id)
            map[key] = {
                ...node,
                key,
                title: node.name,
                isLeaf: false,
                children: []
            }
            if (node.type === 'Building') map[key].icon = <HomeOutlined />
            else if (node.type === 'Floor') map[key].icon = <AppstoreOutlined />
            else if (node.type === 'Device') map[key].icon = <HddOutlined />
            else map[key].icon = <FolderOutlined />
        })

        // 1.5 Create Nodes (Points)
        points.forEach((point) => {
            const key = `point-${point.id}`
            map[key] = {
                ...point,
                key,
                title: point.point_name,
                isLeaf: true,
                isPoint: true, // Marker
                icon: point.object_type?.includes('BINARY') ? <ThunderboltOutlined /> : <LineChartOutlined />
            }
        })

        // 2. Link Parent-Child (Locations)
        locations.forEach(node => {
            const key = String(node.id)
            const parentKey = node.parent_id ? String(node.parent_id) : null

            if (parentKey && map[parentKey]) {
                map[parentKey].children.push(map[key])
            } else if (!node.parent_id) {
                roots.push(map[key])
            }
        })

        // 2.5 Link Parent-Child (Points)
        points.forEach(point => {
            if (point.location_id) {
                const key = `point-${point.id}`
                const parentKey = String(point.location_id)
                if (map[parentKey]) {
                    map[parentKey].children.push(map[key])
                }
            }
        })

        return roots
    }, [locations, points])

    // Handlers
    const handleAdd = (parentId: any) => {
        setEditingNode(null)
        setParentForAdd(parentId ? Number(parentId) : null)
        form.resetFields()
        setIsModalOpen(true)
    }

    const handleEdit = (node: any) => {
        setEditingNode(node)
        setParentForAdd(node.parent_id)
        form.setFieldsValue(node)
        setIsModalOpen(true)
    }

    const handleDelete = async (id: number) => {
        const numId = Number(id)
        Modal.confirm({
            title: 'Delete Location?',
            content: 'This will delete the folder and all its content if empty.',
            onOk: async () => {
                try {
                    const res = await authFetch(`/locations/${numId}`, { method: 'DELETE' })
                    const json = await res.json()
                    if (json.success) {
                        messageApi.success('Deleted')
                        // Local Update
                        setLocations(prev => prev.filter(l => l.id !== numId))
                        onSelectLocation(null)
                    } else {
                        messageApi.error(json.message || 'Failed to delete')
                    }
                } catch { messageApi.error('Error deleting') }
            }
        })
    }

    const handleSave = async (values: any) => {
        const payload = { ...values, parent_id: parentForAdd }
        try {
            let savedItem: any;
            if (editingNode) {
                const res = await authFetch(`/locations/${editingNode.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                })
                savedItem = await res.json()
                setLocations(prev => prev.map(l => l.id === savedItem.id ? savedItem : l))
            } else {
                const res = await authFetch('/locations', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                })
                savedItem = await res.json()
                setLocations(prev => [...prev, savedItem])
                if (payload.parent_id) {
                    setExpandedKeys(prev => [...prev, String(payload.parent_id)])
                    setAutoExpandParent(true)
                }
            }
            messageApi.success('Saved')
            setIsModalOpen(false)
        } catch {
            messageApi.error('Failed to save')
        }
    }

    // Render Request
    const renderTitle = (node: any) => {
        // [NEW] Styling Logic
        const isActive = activeHistoryPathIds.has(node.id)
        let style: React.CSSProperties = {}

        if (showHistoryOnly) {
            if (isActive) {
                style = { fontWeight: 'bold', color: '#1890ff' } // Highlight
                // If it's a leaf folder containing history devices, maybe stronger?
                if (historyLocationIds.has(node.id)) {
                    style = { ...style, background: '#e6f7ff', padding: '0 4px', borderRadius: 4 }
                }
            } else {
                style = { color: '#ccc' } // Grey out
            }
        }

        return (
            <div className="tree-node-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: 8 }}>
                <span style={style}>{node.title}</span>
                {/* Only show menu for Locations (Folders), not Points */}
                {!node.isPoint && (
                    <Dropdown menu={{
                        items: [
                            { key: 'add', label: 'Add Sub-folder', icon: <PlusOutlined />, onClick: (e) => { e.domEvent.stopPropagation(); handleAdd(node.key) } },
                            { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: (e) => { e.domEvent.stopPropagation(); handleEdit(node) } },
                            { type: 'divider' },
                            { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: (e) => { e.domEvent.stopPropagation(); handleDelete(node.key) } }
                        ]
                    }} trigger={['contextMenu', 'click']}>
                        <Button type="text" size="small" icon={<MoreOutlined />} onClick={e => e.stopPropagation()} />
                    </Dropdown>
                )}
            </div>
        )
    }

    const loop = (data: DataNode[]): DataNode[] =>
        data.map(item => ({
            ...item,
            title: renderTitle(item),
            children: item.children ? loop(item.children) : []
        }))


    return (
        <div style={{ padding: '0 8px', height: '100%', overflowY: 'auto' }}>
            {contextHolder}
            <div style={{ marginBottom: 8, textAlign: 'right' }}>
                <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleAdd(null)}>Add Root</Button>
            </div>
            {locations.length > 0 ? (
                <Tree
                    showIcon
                    blockNode
                    expandedKeys={expandedKeys}
                    autoExpandParent={autoExpandParent}
                    onExpand={(keys) => {
                        setExpandedKeys(keys)
                        setAutoExpandParent(false)
                    }}
                    treeData={loop(treeDataNodes)}
                    onSelect={(selectedKeys, info) => {
                        if (selectedKeys.length > 0) onSelectLocation(info.node)
                    }}
                />

            ) : (
                <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No locations</div>
            )}

            <Modal
                title={editingNode ? 'Edit Location' : 'New Location'}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={form.submit}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                        <Select
                            showSearch
                            options={[
                                { label: 'Building', value: 'Building' },
                                { label: 'Floor', value: 'Floor' },
                                { label: 'Room', value: 'Room' },
                                { label: 'Zone', value: 'Zone' },
                                { label: 'Device', value: 'Device' },
                                { label: 'Panel', value: 'Panel' },
                                { label: 'Circuit Breaker', value: 'Circuit Breaker' },
                                { label: 'Phase', value: 'Phase' },
                                { label: 'Folder', value: 'Folder' }
                            ]} />
                    </Form.Item>
                    <Form.Item name="description" label="Description"><Input.TextArea /></Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
