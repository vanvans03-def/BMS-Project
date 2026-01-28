/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Table, Tag, Button, Typography, Badge, Space, Popconfirm } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  EditOutlined,
  ThunderboltOutlined,
  NumberOutlined,
  DeleteOutlined,
  DatabaseOutlined, // [NEW] เพิ่ม Icon สำหรับ Input Register
  LineChartOutlined,
  CheckCircleOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import { useEffect, useRef, useState } from 'react'
import { AnimatedNumber } from '../../components/AnimatedNumber'

// ต้องแน่ใจว่า Type Point ใน types/common.ts เพิ่ม data_format แล้ว
import type { Point, PointValue } from '../../types/common'

const { Text } = Typography

interface Props {
  points: Point[]
  pointValues: Map<number, PointValue>
  loading: boolean
  onWrite: (point: Point) => void
  onDelete: (pointId: number) => void
  onViewHistory: (point: Point) => void
  // [NEW] Props
  dragEnabled?: boolean
  onDragStart?: (e: React.DragEvent, point: Point) => void
  selectedPointIds?: React.Key[]
  onSelectionChange?: (selectedIds: React.Key[]) => void
}

export const ModbusPointTable = ({ points, pointValues, loading, onWrite, onDelete, onViewHistory, dragEnabled, onDragStart, selectedPointIds, onSelectionChange }: Props) => {
  const [updatedPoints, setUpdatedPoints] = useState<Set<number>>(new Set())
  const previousValues = useRef<Map<number, any>>(new Map())

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Effect: ตรวจจับการเปลี่ยนแปลงค่าเพื่อทำ Animation Highlight
  useEffect(() => {
    const newUpdated = new Set<number>()

    pointValues.forEach((value, pointId) => {
      const prevValue = previousValues.current.get(pointId)
      if (prevValue !== undefined && prevValue !== value.value) {
        newUpdated.add(pointId)
      }
      previousValues.current.set(pointId, value.value)
    })

    if (newUpdated.size > 0) {
      setUpdatedPoints(newUpdated)
      setTimeout(() => setUpdatedPoints(new Set()), 800)
    }
  }, [pointValues])

  const columns: ColumnsType<Point> = [
    // [NEW] Added to Hierarchy Status
    {
      title: '',
      key: 'status',
      width: 40,
      render: (_, record: any) => (
        record.location_id ? // Check if point has location_id (added to hierarchy)
          <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
          <InfoCircleOutlined style={{ color: '#faad14', opacity: 0.5 }} />
      )
    },
    {
      title: 'Type',
      dataIndex: 'register_type',
      key: 'type',
      width: 140,
      render: (_, record) => {
        // [MODIFIED] Use display_type (Niagara Style) if available
        if (record.display_type) {
          let color = 'cyan'
          let icon = <NumberOutlined />
          const typeLower = record.display_type.toLowerCase()

          if (typeLower.includes('boolean')) {
            color = 'green'
            icon = <ThunderboltOutlined />
          } else if (typeLower.includes('string')) {
            color = 'orange'
            icon = <DatabaseOutlined />
          }

          return (
            <Tag color={color} icon={icon}>
              {record.display_type}
            </Tag>
          )
        }

        // Fallback logic: Derive from register_type if display_type is missing
        let label = record.register_type?.replace('_', ' ') || 'UNKNOWN'
        let color = 'default'
        let icon = <NumberOutlined />

        const type = record.register_type

        // COIL -> Boolean(W)
        if (type === 'COIL') {
          label = 'Boolean(W)'
          color = 'green'
          icon = <ThunderboltOutlined />
        }
        // DISCRETE_INPUT -> Boolean(R)
        else if (type === 'DISCRETE_INPUT') {
          label = 'Boolean(R)'
          color = 'green'
          icon = <ThunderboltOutlined />
        }
        // HOLDING_REGISTER -> Numeric(W)
        else if (type === 'HOLDING_REGISTER') {
          label = 'Numeric(W)'
          color = 'blue'
          icon = <NumberOutlined />
        }
        // INPUT_REGISTER -> Numeric(R)
        else if (type === 'INPUT_REGISTER') {
          label = 'Numeric(R)'
          color = 'cyan'
          icon = <DatabaseOutlined />
        }

        return (
          <Tag color={color} icon={icon}>
            {label}
          </Tag>
        )
      }
    },
    {
      title: 'Address',
      dataIndex: 'object_instance',
      key: 'address',
      width: 90,
      align: 'center',
      render: (val) => <Text code>{val}</Text>
    },
    {
      title: 'Name',
      dataIndex: 'point_name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Format',
      dataIndex: 'data_format',
      key: 'format',
      width: 120,
      responsive: ['lg'],
      render: (fmt) => {
        if (!fmt || fmt === 'RAW') return <Tag>Raw</Tag>

        // Temp
        if (fmt === 'TEMP_C_100') return <Tag color="orange">Temp ÷100</Tag>
        if (fmt === 'TEMP_C_10') return <Tag color="orange">Temp ÷10</Tag>

        if (fmt === 'HUMIDITY_10') return <Tag color="blue">Humid ÷10</Tag>

        if (fmt === 'SCALE_0.1') return <Tag>Scale ÷10</Tag>
        if (fmt === 'SCALE_0.01') return <Tag>Scale ÷100</Tag>

        if (fmt === 'VOLT_V') return <Tag color="cyan">Voltage</Tag>

        return <Tag>{fmt}</Tag>
      }
    },
    {
      title: 'Value',
      key: 'value',
      width: 160,
      render: (_, record) => {
        const data = pointValues.get(record.id)
        const isUpdated = updatedPoints.has(record.id)

        let content = <Badge status="default" text="-" />

        if (data) {
          // Case 1: COIL (Boolean)
          if (record.register_type === 'COIL') {
            const isOn = data.value === true || data.value === 1 || data.value === 'true'
            content = (
              <Badge
                status={isOn ? 'success' : 'default'}
                text={isOn ? 'ON' : 'OFF'}
              />
            )
          }
          // Case 2: Number (Holding & Input Register)
          else {
            let displayVal = Number(data.value)
            let decimals = 0
            let suffix = ''

            switch (record.data_format) {
              case 'TEMP_C_100':
                displayVal = displayVal / 100
                decimals = 2
                suffix = ' °C'
                break
              case 'TEMP_C_10':
                displayVal = displayVal / 10
                decimals = 1
                suffix = ' °C'
                break

              // ✅ [NEW] เพิ่ม Case Humidity
              case 'HUMIDITY_10':
                displayVal = displayVal / 10
                decimals = 1
                suffix = ' %RH'  // ใส่หน่วยเปอร์เซ็นต์
                break

              // ✅ [NEW] เพิ่ม Case Generic
              case 'SCALE_0.1':
                displayVal = displayVal / 10
                decimals = 1
                suffix = ''
                break
              case 'SCALE_0.01':
                displayVal = displayVal / 100
                decimals = 2
                suffix = ''
                break

              case 'VOLT_V':
                suffix = ' V'
                break

              default:
                break
            }

            // ถ้าค่าไม่ใช่ตัวเลข (เช่น Error หรือ null)
            if (isNaN(displayVal)) {
              content = <Text type="secondary">Error</Text>
            } else {
              content = (
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <Text style={{ color: '#faad14', fontSize: 16, fontWeight: 500 }}>
                    <AnimatedNumber value={displayVal} decimals={decimals} />
                  </Text>
                  {suffix && (
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                      {suffix}
                    </Text>
                  )}
                </div>
              )
            }
          }
        }

        return (
          <div
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              transition: "all 0.5s ease",
              backgroundColor: isUpdated ? "rgba(250, 173, 20, 0.2)" : "transparent",
              border: isUpdated ? "1px solid rgba(250, 173, 20, 0.4)" : "1px solid transparent",
            }}
          >
            {content}
          </div>
        )
      }
    },
    {
      title: 'Action',
      key: 'action',
      align: 'center',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => onWrite(record)}
            title="Write Value"
            // [NEW] ปิดปุ่มเขียนค่า ถ้าเป็น Input Register (Read-only)
            disabled={record.register_type === 'INPUT_REGISTER'}
          />
          <Button
            size="small"
            icon={<LineChartOutlined />}
            onClick={() => onViewHistory(record)}
            title="View History"
          />
          <Popconfirm
            title="Delete Point"
            description="Are you sure to delete this point?"
            onConfirm={() => onDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              title="Delete Point"
            />
          </Popconfirm>
        </Space>
      )
    }
  ]

  const rowSelection = {
    selectedRowKeys: selectedPointIds,
    onChange: onSelectionChange,
    getCheckboxProps: (record: Point) => ({
      disabled: false,
    }),
  }

  return (
    <Table
      // [NEW]
      rowSelection={selectedPointIds ? rowSelection : undefined}
      columns={columns}
      dataSource={points}
      rowKey="id"
      loading={loading}
      pagination={{
        current: currentPage,
        pageSize: pageSize,
        total: points.length,
        showSizeChanger: true,
        showQuickJumper: true,
        pageSizeOptions: ['10', '20', '50'],
        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} points`,
        onChange: (page, newPageSize) => {
          setCurrentPage(page)
          if (newPageSize !== pageSize) {
            setPageSize(newPageSize)
            setCurrentPage(1)
          }
        }
      }}
      scroll={{ x: 800 }}
      rowClassName={(record) => {
        // [NEW] Visual feedback for draggable rows
        if (dragEnabled) return "draggable-row"
        return ""
      }}
      // [NEW] Native Drag & Drop Logic
      onRow={(record) => {
        if (!dragEnabled) return {}
        return {
          draggable: true,
          onDragStart: (e) => {
            // Set drag data
            if (onDragStart) onDragStart(e, record)
            e.dataTransfer.effectAllowed = "move"
          },
          style: { cursor: 'grab' }
        }
      }}
    />
  )
}