import { useState, useEffect } from 'react'
import { Tree, Button, Space, Tooltip, Dropdown, Modal, Form, Input, Select, message } from 'antd'
import {
    PlusOutlined, FolderOutlined, HomeOutlined,
    AppstoreOutlined, DeleteOutlined, EditOutlined, MoreOutlined
} from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import { authFetch } from '../../utils/authFetch'

interface LocationTreePanelProps {
    onSelectLocation: (node: any) => void
}

export const LocationTreePanel = ({ onSelectLocation }: LocationTreePanelProps) => {
    const [treeData, setTreeData] = useState<DataNode[]>([])
    const [locations, setLocations] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [messageApi, contextHolder] = message.useMessage()

    // Add/Edit Modal
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingNode, setEditingNode] = useState<any>(null)
    const [parentForAdd, setParentForAdd] = useState<number | null>(null)
    const [form] = Form.useForm()

    const fetchLocations = async () => {
        setLoading(true)
        try {
            const res = await authFetch('/locations')
            const data = await res.json()
            setLocations(data)
            setTreeData(buildTree(data))
        } catch (err) {
            messageApi.error('Failed to load locations')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLocations()
    }, [])

    const buildTree = (list: any[]): DataNode[] => {
        const map: any = {}
        const roots: any[] = []

        // Init map
        list.forEach((node) => {
            const key = String(node.id)
            map[key] = { ...node, key, title: node.name, children: [] }
            // Icon based on type
            if (node.type === 'Building') map[key].icon = <HomeOutlined />
            else if (node.type === 'Floor') map[key].icon = <AppstoreOutlined />
            else map[key].icon = <FolderOutlined />
        })

        list.forEach(node => {
            const key = String(node.id)
            const parentKey = node.parent_id ? String(node.parent_id) : null

            if (parentKey && map[parentKey]) {
                map[parentKey].children.push(map[key])
            } else {
                roots.push(map[key])
            }
        })
        return roots
    }

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

    const handleDelete = async (id: number) => { // id passed is key (string) or number?
        // tree node key is string now. But API expects number.
        // Let's coerce.
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
                        fetchLocations()
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
            if (editingNode) {
                await authFetch(`/locations/${editingNode.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                })
            } else {
                await authFetch('/locations', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                })
            }
            messageApi.success('Saved')
            setIsModalOpen(false)
            fetchLocations()
        } catch {
            messageApi.error('Failed to save')
        }
    }

    // Render Request
    const renderTitle = (node: any) => {
        return (
            <div className="tree-node-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: 8 }}>
                <span>{node.title}</span>
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
            </div>
        )
    }

    // Recursive loop to inject custom render
    const loop = (data: DataNode[]): DataNode[] =>
        data.map(item => ({
            ...item,
            title: renderTitle(item),
            children: item.children && loop(item.children)
        }))

    return (
        <div style={{ padding: '0 8px', height: '100%', overflowY: 'auto' }}>
            {contextHolder}
            <div style={{ marginBottom: 8, textAlign: 'right' }}>
                <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleAdd(null)}>Add Root</Button>
            </div>
            {treeData.length > 0 ? (
                <Tree
                    showIcon
                    blockNode
                    defaultExpandAll
                    treeData={loop(treeData)}
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
