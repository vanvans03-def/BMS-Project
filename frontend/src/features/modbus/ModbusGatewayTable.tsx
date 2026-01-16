import { Table, Button, Badge, Typography, Tag, Space, Popconfirm, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, FolderOpenOutlined, GlobalOutlined, SettingOutlined } from '@ant-design/icons'
import type { Device } from '../../types/common'

const { Text } = Typography

interface Props {
    gateways: Device[]
    loading: boolean
    onView: (gateway: Device) => void
    onDelete: (id: number) => void
    onEdit: (gateway: Device) => void
}

export const ModbusGatewayTable = ({ gateways, loading, onView, onDelete, onEdit }: Props) => {
    const columns: ColumnsType<Device> = [
        {
            title: 'Status',
            key: 'status',
            width: 100,
            align: 'center',
            render: (_, record) => (
                <Badge
                    status={record.is_active ? 'success' : 'default'}
                    text={record.is_active ? 'Online' : 'Offline'}
                />
            )
        },
        {
            title: 'Gateway Name',
            dataIndex: 'device_name',
            key: 'device_name',
            render: (text) => <Text strong style={{ fontSize: 16 }}>{text}</Text>
        },
        {
            title: 'Network Configuration',
            key: 'network',
            render: (_, record) => {
                if (record.connection_type === 'SERIAL') {
                    return (
                        <Space direction="vertical" size={0}>
                            <Tag icon={<DatabaseOutlined />} color="purple">
                                {record.serial_port_name || 'COM1'}
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {record.serial_baud_rate} / {record.serial_data_bits} / {record.serial_parity?.[0]?.toUpperCase()} / {record.serial_stop_bits}
                            </Text>
                        </Space>
                    )
                }

                let displayIp = record.ip_address
                let displayPort = 502

                if (record.ip_address && record.ip_address.includes(':')) {
                    const parts = record.ip_address.split(':')
                    displayIp = parts[0]
                    displayPort = parseInt(parts[1]) || 502
                }

                return (
                    <Space>
                        <Tag icon={<GlobalOutlined />} color="geekblue">
                            {displayIp}
                        </Tag>
                        <Tag color="default">
                            Port: {displayPort}
                        </Tag>
                    </Space>
                )
            }
        },
        {
            title: 'Action',
            key: 'action',
            align: 'right',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Edit Gateway">
                        <Button
                            icon={<SettingOutlined />}
                            onClick={(e) => { e.stopPropagation(); onEdit(record); }}
                        />
                    </Tooltip>
                    <Button
                        type="primary"
                        ghost
                        icon={<FolderOpenOutlined />}
                        onClick={() => onView(record)}
                    >
                        Open Network
                    </Button>
                    <Popconfirm
                        title="Delete Gateway"
                        description="Deleting a gateway will delete all devices under it. Are you sure?"
                        onConfirm={() => onDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ]

    return (
        <Table
            columns={columns}
            dataSource={gateways}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
        />
    )
}
