/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Table, Tag, Button, Typography, Badge, Space, Popconfirm } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, ThunderboltOutlined, NumberOutlined, DeleteOutlined } from '@ant-design/icons'
import { useEffect, useRef, useState } from 'react'
import { AnimatedNumber } from '../../components/AnimatedNumber'

import type { Point, PointValue } from '../../types/common'

const { Text } = Typography

interface Props {
  points: Point[]
  pointValues: Map<number, PointValue>
  loading: boolean
  onWrite: (point: Point) => void
  onDelete: (pointId: number) => void
}

export const ModbusPointTable = ({ points, pointValues, loading, onWrite, onDelete }: Props) => {
  const [updatedPoints, setUpdatedPoints] = useState<Set<number>>(new Set())
  const previousValues = useRef<Map<number, any>>(new Map())
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // ตรวจจับการเปลี่ยนแปลงค่า
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
    {
      title: 'Type',
      dataIndex: 'register_type',
      key: 'type',
      width: 150,
      render: (type: string | undefined) => {
        let color = 'default'
        let icon = <NumberOutlined />
        
        if (type === 'COIL') { 
          color = 'green'
          icon = <ThunderboltOutlined /> 
        }
        if (type === 'HOLDING_REGISTER') { 
          color = 'blue'
          icon = <NumberOutlined /> 
        }
        
        return (
          <Tag color={color} icon={icon}>
            {type?.replace('_', ' ') ?? 'UNKNOWN'}
          </Tag>
        )
      }
    },
    {
      title: 'Address',
      dataIndex: 'object_instance',
      key: 'address',
      width: 100,
      render: (val) => <Text code>{val}</Text>
    },
    {
      title: 'Name',
      dataIndex: 'point_name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Data Type',
      dataIndex: 'data_type',
      key: 'data_type',
      width: 100,
      responsive: ['lg'],
      render: (type) => <Tag>{type || 'INT16'}</Tag>
    },
    {
      title: 'Value',
      key: 'value',
      width: 150,
      render: (_, record) => {
        const data = pointValues.get(record.id)
        const isUpdated = updatedPoints.has(record.id)

        let content = <Badge status="default" text="-" />

        if (data) {
            if (record.register_type === 'COIL') {
                const isOn = data.value === true || data.value === 1 || data.value === 'true'
                content = (
                    <Badge 
                      status={isOn ? 'success' : 'default'} 
                      text={isOn ? 'ON' : 'OFF'} 
                    />
                )
            } else {
                let displayVal = Number(data.value)
                let decimals = 0

                if (record.register_type === 'HOLDING_REGISTER') {
                    displayVal = displayVal / 100
                    decimals = 2
                }

                content = (
                    <Text style={{ color: '#faad14', fontSize: 16 }}>
                        <AnimatedNumber value={displayVal} decimals={decimals} />
                    </Text>
                )
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

  return (
    <Table
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
    />
  )
}