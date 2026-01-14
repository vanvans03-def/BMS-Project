/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { Table, Button, Badge, Tag, Space, Typography, Tooltip, Spin } from "antd"
import type { ColumnsType } from "antd/es/table"
import {
  DatabaseOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  EditOutlined,
  ClockCircleOutlined,
  LineChartOutlined,
} from "@ant-design/icons"
import { useEffect, useRef, useState } from "react"
import { AnimatedNumber } from "../../components/AnimatedNumber"

const { Text } = Typography

// ... (Interfaces คงเดิม) ...
interface Point {
  id: number
  device_id: number
  object_type: string
  object_instance: number
  point_name: string
  is_monitor: boolean
}

interface PointValue {
  pointId: number
  value: any
  status: string
  timestamp: string
}

interface PointTableProps {
  points: Point[]
  pointValues: Map<number, PointValue>
  loading: boolean
  onWritePoint: (point: Point) => void
  onViewHistory: (point: Point) => void // [NEW]
}

export const PointTable = ({ points, pointValues, loading, onWritePoint, onViewHistory }: PointTableProps) => {
  const [updatedPoints, setUpdatedPoints] = useState<Set<number>>(new Set())
  const previousValues = useRef<Map<number, any>>(new Map())

  // [UPDATED] เพิ่ม State สำหรับ Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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
      // Clear highlight after animation
      setTimeout(() => setUpdatedPoints(new Set()), 800)
    }
  }, [pointValues])

  // ... (Functions formatValue, getValueColor คงเดิม) ...
  const formatValue = (value: any, objectType: string): string => {
    if (value === null || value === undefined) return "-"

    if (objectType.includes("BINARY")) {
      return value === "active" || value === 1 || value === true ? "Active" : "Inactive"
    }

    if (typeof value === "number") {
      return value.toFixed(2)
    }

    return String(value)
  }

  const getValueColor = (value: any, objectType: string): string => {
    if (value === null || value === undefined) return "#999"

    if (objectType.includes("BINARY")) {
      return value === "active" || value === 1 || value === true ? "#52c41a" : "#999"
    }

    return "#1890ff"
  }

  // ... (Columns คงเดิม) ...
  const columns: ColumnsType<Point> = [
    {
      title: "Object Type",
      dataIndex: "object_type",
      key: "type",
      width: 200,
      render: (text) => {
        const typeMap: Record<string, { color: string; icon: any }> = {
          OBJECT_DEVICE: { color: "blue", icon: <DatabaseOutlined /> },
          OBJECT_ANALOG_INPUT: { color: "green", icon: <ThunderboltOutlined /> },
          OBJECT_ANALOG_OUTPUT: { color: "orange", icon: <ThunderboltOutlined /> },
          OBJECT_ANALOG_VALUE: { color: "cyan", icon: <ThunderboltOutlined /> },
          OBJECT_BINARY_INPUT: { color: "purple", icon: <CheckCircleOutlined /> },
          OBJECT_BINARY_OUTPUT: { color: "magenta", icon: <CheckCircleOutlined /> },
          OBJECT_BINARY_VALUE: { color: "volcano", icon: <CheckCircleOutlined /> },
        }
        const config = typeMap[text] || { color: "default", icon: null }
        return (
          <Tag color={config.color} icon={config.icon} style={{ transition: "all 0.3s ease" }}>
            {text.replace("OBJECT_", "")}
          </Tag>
        )
      },
    },
    {
      title: "Instance",
      dataIndex: "object_instance",
      key: "instance",
      width: 100,
      responsive: ["md"],
    },
    {
      title: "Point Name",
      dataIndex: "point_name",
      key: "name",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Value",
      key: "value",
      width: 150,
      render: (_, record) => {
        const pointValue = pointValues.get(record.id)
        const isUpdated = updatedPoints.has(record.id)

        if (!pointValue) {
          if (record.object_type === "OBJECT_DEVICE") {
            return <Text type="secondary">-</Text>
          }

          return (
            <Space>
              <Spin size="small" />
              <Text type="secondary">Loading...</Text>
            </Space>
          )
        }

        const displayValue = formatValue(pointValue.value, record.object_type)
        const color = getValueColor(pointValue.value, record.object_type)
        const isNumber = typeof pointValue.value === "number" && !record.object_type.includes("BINARY")

        return (
          <div
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              transition: "all 0.3s ease",
              backgroundColor: isUpdated ? "rgba(24, 144, 255, 0.1)" : "transparent",
              border: isUpdated ? "1px solid rgba(24, 144, 255, 0.3)" : "1px solid transparent",
            }}
          >
            <Space>
              {record.object_type.includes("BINARY") ? (
                <Badge status={pointValue.value === "active" || pointValue.value === 1 ? "success" : "default"} />
              ) : null}
              {isNumber ? (
                <AnimatedNumber value={pointValue.value} style={{ color, fontSize: 15 }} />
              ) : (
                <Text strong style={{ color, fontSize: 15 }}>
                  {displayValue}
                </Text>
              )}
            </Space>
          </div>
        )
      },
    },
    {
      title: "Updated",
      key: "updated",
      width: 100,
      responsive: ["lg"],
      render: (_, record) => {
        const pointValue = pointValues.get(record.id)
        if (!pointValue) return <Text type="secondary">-</Text>

        const date = new Date(pointValue.timestamp)
        const time = date.toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })

        return (
          <Tooltip title={date.toLocaleString("th-TH")}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <ClockCircleOutlined /> {time}
            </Text>
          </Tooltip>
        )
      },
    },
    {
      title: "Action",
      key: "action",
      align: "center",
      width: 120,
      render: (_, record) => {
        const isWritable = [
          "OBJECT_ANALOG_VALUE",
          "OBJECT_BINARY_VALUE",
          "OBJECT_ANALOG_OUTPUT",
          "OBJECT_BINARY_OUTPUT",
        ].includes(record.object_type)

        return (
          <Space>
            <Tooltip title="View Details">
              <Button
                icon={<InfoCircleOutlined />}
                size="small"
                style={{ transition: "all 0.2s ease" }}
                className="hover-lift"
              />
            </Tooltip>

            {isWritable ? (
              <Tooltip title="Override Value">
                <Button
                  type="primary"
                  ghost
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => onWritePoint(record)}
                  style={{ transition: "all 0.2s ease" }}
                  className="hover-lift"
                />
              </Tooltip>
            ) : (
              <Button type="text" size="small" icon={<EditOutlined />} disabled style={{ visibility: "hidden" }} />
            )}

            <Tooltip title="View History">
              <Button
                icon={<LineChartOutlined />}
                size="small"
                onClick={() => onViewHistory(record)}
                style={{ transition: "all 0.2s ease" }}
                className="hover-lift"
              />
            </Tooltip>
          </Space>
        )
      },
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={points}
      loading={loading}
      rowKey="id"
      // [UPDATED] ใช้ Pagination รูปแบบเดียวกับ LogsPage
      pagination={{
        current: currentPage,
        pageSize: pageSize,
        total: points.length,
        showSizeChanger: true,
        showQuickJumper: true,
        pageSizeOptions: ['10', '20', '50', '100'],
        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} points`,
        onChange: (page, newPageSize) => {
          setCurrentPage(page)
          if (newPageSize !== pageSize) {
            setPageSize(newPageSize)
            setCurrentPage(1)
          }
        }
      }}
      scroll={{ x: 1000 }}
      rowClassName={() => "fade-in-row"}
    />
  )
}