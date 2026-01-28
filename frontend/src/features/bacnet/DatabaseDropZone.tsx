/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { Card, Button, Typography, Space, Tag } from 'antd'
import { DatabaseOutlined, SaveOutlined, CloudDownloadOutlined } from '@ant-design/icons'
import type { Point } from '../../types/common'

const { Text, Title } = Typography

interface DatabaseDropZoneProps {
    stagedPoints: Point[]
    onDropPoint: (pointId: number) => void
    onRemovePoint: (pointId: number) => void
    onSave: () => void
    onCancel: () => void
    visible: boolean
    loading?: boolean
}

export const DatabaseDropZone = ({ stagedPoints, onDropPoint, onRemovePoint, onSave, onCancel, visible, loading }: DatabaseDropZoneProps) => {
    const [isOver, setIsOver] = useState(false)

    if (!visible) return null

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (!isOver) setIsOver(true)
    }

    const handleDragLeave = () => {
        setIsOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsOver(false)
        const pointId = e.dataTransfer.getData('pointId')
        if (pointId) {
            onDropPoint(Number(pointId))
        }
    }

    return (
        <div
            style={{
                position: 'sticky',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                background: '#fff',
                boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
                borderTop: '1px solid #e8e8e8',
                padding: '16px 24px',
                transition: 'all 0.3s ease',
                transform: visible ? 'translateY(0)' : 'translateY(100%)',
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                {/* Drop Target Area */}
                <div
                    style={{
                        flex: 1,
                        border: `2px dashed ${isOver ? '#1890ff' : '#d9d9d9'}`,
                        borderRadius: 8,
                        background: isOver ? '#e6f7ff' : '#fafafa',
                        padding: 16,
                        minHeight: 100,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                >
                    {stagedPoints.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#999' }}>
                            <CloudDownloadOutlined style={{ fontSize: 32, marginBottom: 8, color: isOver ? '#1890ff' : '#ccc' }} />
                            <Text type="secondary" style={{ display: 'block' }}>Drag points from the table above and drop them here</Text>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {stagedPoints.map(p => (
                                <Tag
                                    key={p.id}
                                    closable
                                    onClose={() => onRemovePoint(p.id)}
                                    color="blue"
                                    style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }}
                                >
                                    {p.point_name}
                                </Tag>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <Card size="small" style={{ width: 300 }}>
                    <Title level={5} style={{ marginTop: 0 }}>
                        <DatabaseOutlined /> Staged Changes
                    </Title>
                    <div style={{ marginBottom: 16 }}>
                        <Text>Adding <Text strong>{stagedPoints.length}</Text> points to database.</Text>
                    </div>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            block
                            onClick={onSave}
                            disabled={stagedPoints.length === 0}
                            loading={loading}
                        >
                            Save to Database
                        </Button>
                        <Button block onClick={onCancel}>Cancel</Button>
                    </Space>
                </Card>
            </div>
        </div>
    )
}
