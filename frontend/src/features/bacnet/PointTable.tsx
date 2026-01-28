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
  ClockCircleOutlined,
  LineChartOutlined,
  SettingOutlined,
  EditOutlined,
} from "@ant-design/icons"
import { useEffect, useRef, useState } from "react"
import { AnimatedNumber } from "../../components/AnimatedNumber"
import type { Point, PointValue } from "../../types/common"

const { Text } = Typography

// ... (Interfaces คงเดิม) ...


interface PointTableProps {
  points: Point[]
  pointValues: Map<number, PointValue>
  loading: boolean
  onWritePoint: (point: Point) => void
  onViewHistory: (point: Point) => void
  onConfigPoint: (point: Point) => void
  onAddToDatabase?: (pointIds: React.Key[]) => void
  onToggleHistory?: (point: Point) => void
  // [NEW] Drag & Drop Props
  dragEnabled?: boolean
  onDragStart?: (e: React.DragEvent, point: Point) => void
  // [NEW] Controlled Selection Props
  selectedPointIds?: React.Key[]
  onSelectionChange?: (selectedIds: React.Key[]) => void
}

export const PointTable = ({ points, pointValues, loading, onWritePoint, onViewHistory, onConfigPoint, onAddToDatabase, onToggleHistory, dragEnabled, onDragStart, selectedPointIds, onSelectionChange }: PointTableProps) => {
  const [updatedPoints, setUpdatedPoints] = useState<Set<number>>(new Set())
  const previousValues = useRef<Map<number, any>>(new Map())

  // [UPDATED] เพิ่ม State สำหรับ Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    // ... (no change to effect) ...
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

  // ... (Functions formatValue, getValueColor remain same) ...
  const formatValue = (value: any, objectType: string): string => {
    // ... same as before ... 
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
    // ... same as before ...
    if (value === null || value === undefined) return "#999"

    if (objectType.includes("BINARY")) {
      return value === "active" || value === 1 || value === true ? "#52c41a" : "#999"
    }

    return "#1890ff"
  }

  // [NEW] Row Selection Logic (Controlled or Uncontrolled)
  const [internalSelectedRowKeys, setInternalSelectedRowKeys] = useState<React.Key[]>([])

  const finalSelectedRowKeys = selectedPointIds !== undefined ? selectedPointIds : internalSelectedRowKeys

  const onSelectChangeHandler = (newSelectedRowKeys: React.Key[]) => {
    if (onSelectionChange) {
      onSelectionChange(newSelectedRowKeys)
    } else {
      setInternalSelectedRowKeys(newSelectedRowKeys)
    }
  }

  const rowSelection = {
    selectedRowKeys: finalSelectedRowKeys,
    onChange: onSelectChangeHandler,
    getCheckboxProps: (record: Point) => ({
      disabled: record.object_type === 'OBJECT_DEVICE', // [FIX] Disable selection for DEVICE object
    }),
  }

  // ... (Columns) ...
  const columns: ColumnsType<Point> = [
    // ... (Columns remain same) ...
    // [NEW] Hierarchy Status
    {
      title: '',
      key: 'status',
      width: 40,
      render: (_, record: any) => (
        record.location_id ?
          <Tooltip title="Added to Database"><CheckCircleOutlined style={{ color: '#52c41a' }} /></Tooltip> :
          <Tooltip title="Not in Hierarchy"><InfoCircleOutlined style={{ color: '#faad14' }} /></Tooltip>
      )
    },
    {
      title: "Property",
      dataIndex: "universal_type",
      key: "type",
      width: 180,
      render: (text, record: any) => {
        const displayType = text || record.object_type?.replace("OBJECT_", "") || "UNKNOWN"
        let color = "default"
        let icon = <DatabaseOutlined />

        if (displayType.includes("BOOLEAN")) {
          if (displayType.includes("_R")) { color = "purple"; icon = <CheckCircleOutlined /> }
          else { color = "magenta"; icon = <ThunderboltOutlined /> }
        } else if (displayType.includes("NUMERIC")) {
          if (displayType.includes("_R")) { color = "blue"; icon = <LineChartOutlined /> }
          else { color = "orange"; icon = <EditOutlined /> }
        } else if (displayType.includes("STRING")) {
          color = "cyan"; icon = <InfoCircleOutlined />
        } else {
          if (displayType.includes("BINARY")) color = "purple"
          else if (displayType.includes("ANALOG")) color = "blue"
        }

        return (
          <Tag color={color} icon={icon} style={{ transition: "all 0.3s ease", minWidth: 100, textAlign: 'center' }}>
            {displayType}
          </Tag>
        )
      },
    },
    {
      title: "Instance",
      dataIndex: "object_instance",
      key: "instance",
      width: 80,
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
      title: "History",
      key: "history",
      width: 80,
      align: 'center',
      render: (_, record: any) => (
        <Button
          size="small"
          type={record.is_history_enabled ? 'primary' : 'default'}
          icon={<ClockCircleOutlined />}
          onClick={(e) => {
            e.stopPropagation()
            if (onToggleHistory) onToggleHistory(record)
          }}
        />
      )
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

            <Tooltip title="Configuration">
              <Button
                icon={<SettingOutlined />}
                size="small"
                onClick={() => onConfigPoint(record)}
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
    <>
      {/* [NEW] Bulk Actions Toolbar - Removed 'Add to Database' button */}
      {finalSelectedRowKeys.length > 0 && (
        <div style={{ marginBottom: 16, padding: '8px 16px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space>
            <Text strong>{finalSelectedRowKeys.length} points selected</Text>
          </Space>
          <Space>
            {/* 'Add to Database' button removed as per user request to use the bottom box instead */}
            <Button onClick={() => {
              if (onSelectionChange) onSelectionChange([])
              else setInternalSelectedRowKeys([])
            }}>Cancel</Button>
          </Space>
        </div>
      )}

      <Table
        rowSelection={rowSelection}
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
        rowClassName={(record) => {
          // [NEW] Visual feedback for draggable rows
          if (dragEnabled) return "fade-in-row draggable-row"
          return "fade-in-row"
        }}
        // [NEW] Native Drag & Drop Logic
        onRow={(record) => {
          if (!dragEnabled) return {}
          return {
            draggable: true,
            onDragStart: (e) => {
              // Set drag data
              if (onDragStart) onDragStart(e, record)
              // Visual effect
              e.dataTransfer.effectAllowed = "move"
              // Transparent ghost image could be set here if needed
            },
            style: { cursor: 'grab' }
          }
        }}
      />
    </>
  )
}