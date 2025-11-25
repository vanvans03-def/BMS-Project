/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react'
import { Modal, Button, Input, Select, Space, Typography, Tag, Divider } from 'antd'
import {
  EditOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'
import AOS from 'aos'

const { Text } = Typography

interface Point {
  id: number
  device_id: number
  object_type: string
  object_instance: number
  point_name: string
  is_monitor: boolean
}


interface WriteValueModalProps {
  open: boolean
  point: Point | null
  currentValue: any
  writeValue: string | number
  priority: number
  loading: boolean
  onClose: () => void
  onWrite: () => void
  onValueChange: (value: string | number) => void
  onPriorityChange: (priority: number) => void
}

export const WriteValueModal = ({
  open,
  point,
  currentValue,
  writeValue,
  priority,
  loading,
  onClose,
  onWrite,
  onValueChange,
  onPriorityChange
}: WriteValueModalProps) => {
  useEffect(() => {
    if (open) {
      AOS.refresh()
    }
  }, [open])

  if (!point) return null

  return (
    <Modal
      title={
        <Space>
          <EditOutlined />
          <span>Override Value</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={500}
      footer={[
        <Button key="back" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={onWrite}
          icon={<SaveOutlined />}
        >
          Write / Set
        </Button>
      ]}
    >
      <div style={{ paddingTop: 8 }}>
        {/* Info Section */}
        <div 
          style={{ marginBottom: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}
          data-aos="fade-up"
          data-aos-duration="400"
        >
          <Text strong style={{ display: 'block', marginBottom: 4 }}>Target Point:</Text>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Text>{point.point_name}</Text>
            <Tag color="blue">
              {point.object_type.replace('OBJECT_', '')} : {point.object_instance}
            </Tag>
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text type="secondary">Current Value:</Text>
            <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
              {currentValue ?? '-'}
            </Text>
          </div>
        </div>

        {/* Input Section */}
        <div style={{ marginBottom: 16 }} data-aos="fade-up" data-aos-delay="100">
          <Text strong>New Value:</Text>
          {point.object_type.includes('BINARY') ? (
            <div style={{ marginTop: 8 }}>
              <Select
                style={{ width: '100%' }}
                size="large"
                value={writeValue === 1 || writeValue === 'active' ? 1 : 0}
                onChange={(val) => onValueChange(val)}
                options={[
                  {
                    value: 1,
                    label: (
                      <span>
                        <CheckCircleOutlined style={{ color: 'green' }} /> Active (On)
                      </span>
                    )
                  },
                  {
                    value: 0,
                    label: (
                      <span>
                        <CloseCircleOutlined style={{ color: 'gray' }} /> Inactive (Off)
                      </span>
                    )
                  }
                ]}
              />
            </div>
          ) : (
            <Input
              style={{ marginTop: 8 }}
              size="large"
              placeholder="Enter value..."
              value={writeValue}
              onChange={(e) => onValueChange(e.target.value)}
              type="number"
              suffix={<Text type="secondary">Unit</Text>}
            />
          )}
        </div>

        {/* Priority Section */}
        <div style={{ marginTop: 24 }} data-aos="fade-up" data-aos-delay="200">
          <Divider plain>
            <Text type="secondary" style={{ fontSize: 12 }}>Advanced Options</Text>
          </Divider>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary">Priority Level:</Text>
            <Select
              style={{ width: '100%' }}
              value={priority}
              onChange={onPriorityChange}
              options={[
                { value: 1, label: 'Level 1 - Manual Life Safety' },
                { value: 8, label: 'Level 8 - Manual Operator (Default)' },
                { value: 16, label: 'Level 16 - Low Priority' }
              ]}
            />
          </Space>
        </div>
      </div>
    </Modal>
  )
}