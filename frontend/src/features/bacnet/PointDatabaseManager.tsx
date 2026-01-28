/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react'
import { Card, List, Button, Typography, Space, Tag, Empty, Divider, Badge } from 'antd'
import {
    DatabaseOutlined,
    CloudServerOutlined,
    ArrowDownOutlined,
    ThunderboltOutlined,
    LineChartOutlined,
    SaveOutlined,
    ReloadOutlined
} from '@ant-design/icons'
import type { Point } from '../../types/common'

const { Text, Title } = Typography

interface PointDatabaseManagerProps {
    points: Point[]
    onSave: (pointIds: number[]) => Promise<void>
    onCancel: () => void
    loading?: boolean
}

export const PointDatabaseManager = ({ points, onSave, onCancel, loading }: PointDatabaseManagerProps) => {
    // Points that are already in DB (have location_id)
    const existingDbIds = useMemo(() => new Set(points.filter(p => p.location_id).map(p => p.id)), [points])

    // Points currently in the "Database" box (Existing + Staged)
    const [stagedIds, setStagedIds] = useState<Set<number>>(new Set())

    const { sourcePoints, targetPoints } = useMemo(() => {
        const source: Point[] = []
        const target: Point[] = []

        points.forEach(p => {
            const isTarget = existingDbIds.has(p.id) || stagedIds.has(p.id)
            if (isTarget) {
                target.push(p)
            } else {
                source.push(p)
            }
        })
        return { sourcePoints: source, targetPoints: target }
    }, [points, existingDbIds, stagedIds])

    // Drag Handlers
    const handleDragStart = (e: React.DragEvent, pointId: number) => {
        e.dataTransfer.setData('pointId', String(pointId))
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault() // Allow dropping
        e.dataTransfer.dropEffect = 'move'
    }

    const handleDropToTarget = (e: React.DragEvent) => {
        e.preventDefault()
        const pointId = Number(e.dataTransfer.getData('pointId'))
        if (pointId && !existingDbIds.has(pointId) && !stagedIds.has(pointId)) {
            const newSet = new Set(stagedIds)
            newSet.add(pointId)
            setStagedIds(newSet)
        }
    }

    const handleDropToSource = (e: React.DragEvent) => {
        e.preventDefault()
        const pointId = Number(e.dataTransfer.getData('pointId'))
        // Only allow moving back if it was just staged (not already in existing DB)
        if (pointId && stagedIds.has(pointId) && !existingDbIds.has(pointId)) {
            const newSet = new Set(stagedIds)
            newSet.delete(pointId)
            setStagedIds(newSet)
        }
    }

    const handleSave = async () => {
        if (stagedIds.size === 0) return
        await onSave(Array.from(stagedIds))
        setStagedIds(new Set()) // Clear staged after save (they will become existingDbIds)
    }

    // Helper to render a draggable item
    const renderItem = (item: Point, isDraggable: boolean) => (
        <div
            draggable={isDraggable}
            onDragStart={(e) => isDraggable && handleDragStart(e, item.id)}
            style={{
                padding: '8px 12px',
                marginBottom: 8,
                background: '#fff',
                border: '1px solid #d9d9d9',
                borderRadius: 4,
                cursor: isDraggable ? 'grab' : 'default',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                opacity: isDraggable ? 1 : 0.7
            }}
            className="hover-shadow"
        >
            <Space>
                {item.object_type.includes('BINARY') ? <ThunderboltOutlined style={{ color: 'purple' }} /> : <LineChartOutlined style={{ color: 'blue' }} />}
                <Text strong>{item.point_name}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{item.object_type.replace('OBJECT_', '')} {item.object_instance}</Text>
            </Space>
            {stagedIds.has(item.id) && <Tag color="green">New</Tag>}
        </div>
    )

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Point Database Manager</Title>
                <Space>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSave}
                        disabled={stagedIds.size === 0}
                        loading={loading}
                    >
                        Save Changes ({stagedIds.size})
                    </Button>
                </Space>
            </div>

            {/* TOP BOX: DISCOVERED / SOURCE */}
            <Card
                title={<Space><CloudServerOutlined /> Discovered Points (Source)</Space>}
                size="small"
                style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fafafa', borderColor: '#d9d9d9', borderStyle: 'dashed' }}
                bodyStyle={{ flex: 1, overflowY: 'auto', maxHeight: '35vh' }}
                onDragOver={handleDragOver}
                onDrop={handleDropToSource}
            >
                <div style={{ minHeight: '100%' }}>
                    {sourcePoints.length === 0 ? (
                        <Empty description="No Discovered Points" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                        sourcePoints.map(p => renderItem(p, true))
                    )}
                </div>
            </Card>

            {/* ARROW INDICATOR */}
            <div style={{ textAlign: 'center' }}>
                <ArrowDownOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                <div style={{ fontSize: 12, color: '#999' }}>Drag points down to add</div>
            </div>

            {/* BOTTOM BOX: DATABASE / TARGET */}
            <Card
                title={<Space><DatabaseOutlined /> Database Points (Target)</Space>}
                size="small"
                style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f6ffed', borderColor: '#b7eb8f' }}
                headStyle={{ background: '#f6ffed', color: '#389e0d' }}
                bodyStyle={{ flex: 1, overflowY: 'auto', maxHeight: '35vh' }}
                onDragOver={handleDragOver}
                onDrop={handleDropToTarget}
            >
                <div style={{ minHeight: '100%' }}>
                    {targetPoints.length === 0 ? (
                        <Empty description="Database Empty" />
                    ) : (
                        targetPoints.map(p => renderItem(p, stagedIds.has(p.id))) // Only staged items are draggable back
                    )}
                </div>
            </Card>
        </div>
    )
}
