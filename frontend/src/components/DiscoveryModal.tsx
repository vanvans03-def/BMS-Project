/* eslint-disable react-hooks/set-state-in-effect */
import { Modal, Button, Table, Space, Typography, Spin, Empty } from 'antd'
import { WifiOutlined, LoadingOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import AOS from 'aos'

const { Text, Title } = Typography

interface DiscoveredDevice {
  deviceId: number
  address: string
  networkNumber?: number
}

interface DiscoveryModalProps {
  open: boolean
  loading: boolean
  adding: boolean
  devices: DiscoveredDevice[]
  selectedRows: React.Key[]
  existingDeviceIds: Set<number>
  onClose: () => void
  onAdd: () => void
  onSelectionChange: (keys: React.Key[]) => void
}

export const DiscoveryModal = ({
  open,
  loading,
  adding,
  devices,
  selectedRows,
  existingDeviceIds,
  onClose,
  onAdd,
  onSelectionChange
}: DiscoveryModalProps) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const [showContent, setShowContent] = useState(false)

  // Control modal visibility with delay for smooth content load
  useEffect(() => {
    if (open && loading) {
      // Open immediately when loading
      setInternalOpen(true)
      setShowContent(false)
    } else if (open && !loading) {
      // Keep modal open but prepare content
      setShowContent(true)
    } else {
      // Close modal
      setInternalOpen(false)
      setShowContent(false)
    }
  }, [open, loading])

  useEffect(() => {
    if (showContent) {
      AOS.refresh()
    }
  }, [showContent])

  return (
    <Modal
      title={
        <Space>
          <WifiOutlined />
          <span>
            {loading 
              ? 'Scanning Network...' 
              : showContent && devices.length > 0
                ? `Found ${devices.length} Device${devices.length > 1 ? 's' : ''}` 
                : showContent && devices.length === 0
                  ? 'No Devices Found'
                  : 'Scan Network for Devices'}
          </span>
        </Space>
      }
      open={internalOpen}
      onCancel={onClose}
      width={700}
      centered
      destroyOnHidden={false}
      maskClosable={false}
      footer={
        loading ? null : showContent ? [
          <Button key="c" onClick={onClose}>
            Close
          </Button>,
          devices.length > 0 && (
            <Button
              key="s"
              type="primary"
              onClick={onAdd}
              loading={adding}
              disabled={selectedRows.length === 0}
            >
              Add Selected ({selectedRows.length})
            </Button>
          )
        ] : null
      }
    >
      {/* Loading State */}
      {loading && (
        <div 
          style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            minHeight: 300,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          data-aos="fade"
          data-aos-duration="300"
        >
          <Spin 
            indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} 
            size="large"
          />
          <Title level={4} style={{ marginTop: 24, marginBottom: 8 }}>
            Discovering Devices...
          </Title>
          <Text type="secondary">
            Scanning BACnet network for available devices
          </Text>
          <div 
            style={{ 
              marginTop: 24,
              padding: '12px 24px',
              background: '#f0f2f5',
              borderRadius: 8,
              display: 'inline-block'
            }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>
              This may take a few seconds
            </Text>
          </div>
        </div>
      )}

      {/* Results State - Devices Found */}
      {!loading && showContent && devices.length > 0 && (
        <div 
          style={{
            minHeight: 300
          }}
        >
          <Table
            columns={[
              { 
                title: 'Device ID', 
                dataIndex: 'deviceId', 
                width: 120,
                render: (val) => <Text strong>{val}</Text>
              },
              { 
                title: 'IP Address', 
                dataIndex: 'address',
                render: (val) => <Text code>{val}</Text>
              },
              {
                title: 'MAC Address',
                dataIndex: 'networkNumber',
                render: (val) => (
                  <Text type="secondary">
                    {val ? `00:14:2B:3C:${val}` : '-'}
                  </Text>
                )
              }
            ]}
            dataSource={devices}
            rowKey="deviceId"
            size="small"
            pagination={false}
            scroll={{ y: 300 }}
            rowClassName={(_, index) => `table-row-${index}`}
            rowSelection={{
              type: 'checkbox',
              onChange: onSelectionChange,
              selectedRowKeys: selectedRows,
              getCheckboxProps: (r) => ({
                disabled: existingDeviceIds.has(r.deviceId)
              })
            }}
          />
        </div>
      )}

      {/* Empty State - No Devices */}
      {!loading && showContent && devices.length === 0 && (
        <div 
          style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            minHeight: 300,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          data-aos="zoom-in"
          data-aos-duration="400"
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" size={8}>
                <Text strong>No Devices Found</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Make sure devices are powered on and connected to the network
                </Text>
              </Space>
            }
          >
            <Button type="primary" onClick={onClose}>
              Try Again Later
            </Button>
          </Empty>
        </div>
      )}

      <style>
        {`
          /* Staggered animation for table rows */
          ${devices.map((_, index) => `
            .table-row-${index} {
              animation: slideInFromLeft 0.4s ease forwards;
              animation-delay: ${index * 0.08}s;
              opacity: 0;
            }
          `).join('\n')}

          @keyframes slideInFromLeft {
            from {
              opacity: 0;
              transform: translateX(-30px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          /* Smooth fade for modal content */
          .ant-modal-body {
            transition: all 0.3s ease;
          }

          /* Add slight scale effect to table */
          .ant-table {
            animation: scaleIn 0.3s ease;
          }

          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>
    </Modal>
  )
}