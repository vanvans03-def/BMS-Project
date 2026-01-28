/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * BACnet Gateway Manager Component
 * 
 * Manages BACnet gateways with full CRUD operations
 * integrated with gateway settings (interface, port, localDeviceId, apduTimeout)
 */

import { Table, Button, Space, Popconfirm, Tag, Badge, message, Spin, Modal, Form, Input, InputNumber, Row, Col, Typography, Alert, Checkbox, Select, Divider } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import * as configService from '../../services/configService'
import type { NetworkInterface } from '../../services/configService'

const { Title, Text } = Typography

interface BACnetGateway {
  id: number
  name: string
  enable: boolean
  config: {
    interface: string
    ip?: string
    port: number
    localDeviceId: number
    apduTimeout?: number
  }
}

const HexPortInput = ({ value, onChange }: { value?: number; onChange?: (value: number | null) => void }) => {
  const triggerChange = (newValue: number) => {
    onChange?.(newValue)
  }

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value.toUpperCase()
    if (/^[0-9A-F]*$/.test(hex)) {
      if (hex === '') {
        onChange?.(null)
      } else {
        const num = parseInt(hex, 16)
        if (!isNaN(num) && num <= 65535) {
          triggerChange(num)
        }
      }
    }
  }

  const onIncrement = () => {
    const current = Number(value) || 47808
    if (current < 65535) {
      triggerChange(current + 1)
    }
  }

  const onDecrement = () => {
    const current = Number(value) || 47808
    if (current > 1) {
      triggerChange(current - 1)
    }
  }

  const displayValue = value !== undefined && value !== null ? value.toString(16).toUpperCase() : ''

  return (
    <Space.Compact style={{ width: '100%' }}>
      <Button size="small" onClick={onDecrement}>−</Button>
      <Input
        style={{ flex: 1, textAlign: 'center' }}
        placeholder="BAC0"
        value={displayValue}
        onChange={onInputChange}
        maxLength={4}
      />
      <Button size="small" onClick={onIncrement}>+</Button>
    </Space.Compact>
  )
}

export const BACnetGatewayManager = ({
  onSelectGateway
}: {
  onSelectGateway?: (gateway: BACnetGateway) => void
}) => {
  const [gateways, setGateways] = useState<BACnetGateway[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGateway, setEditingGateway] = useState<BACnetGateway | null>(null)
  const [saving, setSaving] = useState(false)
  const [networkInterfaces, setNetworkInterfaces] = useState<NetworkInterface[]>([])
  const [selectedInterface, setSelectedInterface] = useState<NetworkInterface | null>(null)
  const [loadingInterfaces, setLoadingInterfaces] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadGateways()
  }, [])

  const loadGateways = async () => {
    setLoading(true)
    try {
      const response = await configService.getBacnetNetwork()
      // [FIX] Response is now an array of objects
      if (Array.isArray(response)) {
        setGateways(response.map(item => item.network as any))
      } else if (response && (response as any).network) {
        // Fallback for legacy structure if any
        setGateways([(response as any).network as any])
      } else {
        setGateways([])
      }
    } catch (err) {
      console.error('Failed to load BACnet gateways:', err)
      message.error('Failed to load gateways')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAddModal = () => {
    setEditingGateway(null)
    form.resetFields()
    setSelectedInterface(null)
    form.setFieldsValue({
      enable: true,
      interface: '',
      ip: '',
      port: 47808,
      localDeviceId: 1,
      apduTimeout: 3000
    })
    // Load network interfaces
    loadNetworkInterfaces()
    setIsModalOpen(true)
  }

  const loadNetworkInterfaces = async () => {
    setLoadingInterfaces(true)
    try {
      const interfaces = await configService.getNetworkInterfaces()
      setNetworkInterfaces(interfaces)
    } catch (err) {
      console.error('Failed to load network interfaces:', err)
      message.error('Failed to load network interfaces')
    } finally {
      setLoadingInterfaces(false)
    }
  }

  const handleInterfaceChange = (interfaceName: string) => {
    const iface = networkInterfaces.find(i => i.name === interfaceName)
    if (iface) {
      setSelectedInterface(iface)
      form.setFieldsValue({ ip: iface.ip })
    }
  }

  const handleOpenEditModal = (gateway: BACnetGateway) => {
    setEditingGateway(gateway)
    // Load interfaces to ensure we have the list
    loadNetworkInterfaces()

    form.setFieldsValue({
      name: gateway.name,
      enable: gateway.enable,
      interface: gateway.config?.interface || '',
      ip: gateway.config?.ip || '',
      port: gateway.config?.port || 47808,
      localDeviceId: gateway.config?.localDeviceId || 1,
      apduTimeout: gateway.config?.apduTimeout || 3000
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const values = await form.validateFields()

      const gatewayData = {
        name: values.name,
        enable: values.enable,
        config: {
          interface: values.interface,
          ip: values.ip,
          port: values.port,
          localDeviceId: values.localDeviceId,
          apduTimeout: values.apduTimeout
        }
      }

      if (editingGateway) {
        // Update existing
        await configService.updateNetworkConfig(editingGateway.id, gatewayData)
        message.success('Gateway updated successfully')
      } else {
        // Create new
        await configService.createNetworkConfig(
          values.name,
          'BACNET',
          gatewayData.config,
          values.enable
        )
        message.success('Gateway created successfully')
      }

      setIsModalOpen(false)
      loadGateways()
    } catch (err: any) {
      console.error('Failed to save gateway:', err)
      message.error(`Failed to save: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (gatewayId: number) => {
    try {
      await configService.deleteNetworkConfig(gatewayId)
      message.success('Gateway deleted successfully')
      loadGateways()
    } catch (err: any) {
      console.error('Failed to delete gateway:', err)
      message.error(`Failed to delete: ${err.message}`)
    }
  }

  const columns = [
    {
      title: 'Status',
      dataIndex: 'enable',
      key: 'enable',
      width: 100,
      render: (enable: boolean) => (
        <Badge
          status={enable ? 'processing' : 'default'}
          text={enable ? 'Enabled' : 'Disabled'}
        />
      )
    },
    {
      title: 'Gateway Name',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Device ID',
      dataIndex: ['config', 'localDeviceId'],
      key: 'localDeviceId',
      width: 100,
      render: (id: number) => <Tag color="blue">{id}</Tag>
    },
    {
      title: 'Configuration',
      key: 'config',
      width: 350,
      render: (_: any, record: BACnetGateway) => {
        if (!record.config) {
          return <div style={{ fontSize: '12px', color: '#999' }}>Not configured</div>
        }
        return (
          <div style={{ fontSize: '12px' }}>
            <div><Text strong>Interface:</Text> {record.config.interface} {record.config.ip ? `(${record.config.ip})` : ''}</div>
            <Space split={<Divider type="vertical" />}>
              <span><Text strong>Port:</Text> {record.config.port}</span>
              <span><Text strong>Timeout:</Text> {record.config.apduTimeout}ms</span>
            </Space>
          </div>
        )
      }
    },
    {
      title: 'Action',
      key: 'actions',
      width: 200,
      render: (_: any, record: BACnetGateway) => (
        <Space>
          <Button
            type="default"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => handleOpenEditModal(record)}
          />
          <Button
            type="primary"
            size="small"
            onClick={() => onSelectGateway?.(record)}
          >
            View Devices
          </Button>
          <Popconfirm
            title="Delete Gateway"
            description="Remove this BACnet gateway?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <Spin spinning={loading}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>BACnet Gateways</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenAddModal}
          >
            Add Gateway
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={gateways}
          rowKey="id"
          pagination={false}
          size="small"
          locale={{ emptyText: 'No BACnet gateways configured' }}
        />

        {/* Add/Edit Modal */}
        <Modal
          title={editingGateway ? 'Edit BACnet Gateway' : 'Add BACnet Gateway'}
          open={isModalOpen}
          onOk={handleSave}
          onCancel={() => setIsModalOpen(false)}
          okButtonProps={{ loading: saving }}
          width={600}
        >
          <Alert
            message="Gateway Configuration"
            description="Configure BACnet gateway settings including network interface, port, local device ID, and APDU timeout."
            type="info"
            style={{ marginBottom: 16 }}
            showIcon
          />

          <Form form={form} layout="vertical">
            <Form.Item
              name="name"
              label="Gateway Name"
              rules={[{ required: true, message: 'Gateway name is required' }]}
            >
              <Input placeholder="e.g., BACnet Gateway 1" />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="interface"
                  label="Network Interface"
                  rules={[{ required: true, message: 'Interface is required' }]}
                >
                  <Select
                    placeholder="Select network interface"
                    loading={loadingInterfaces}
                    onChange={handleInterfaceChange}
                    options={networkInterfaces.map(iface => ({
                      label: `${iface.name} ${iface.ip ? `(${iface.ip})` : ''}`,
                      value: iface.name
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="ip"
                  label="Interface IP"
                  rules={[{ required: true, message: 'IP is required' }]}
                >
                  <Input
                    placeholder="Interface IP (e.g. 192.168.1.10)"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="localDeviceId"
                  label="Local Device ID"
                  rules={[{ required: true, message: 'Device ID is required' }]}
                  tooltip="Unique identifier for this gateway in BACnet network (0-4194303)"
                >
                  <InputNumber
                    min={0}
                    max={4194303}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="enable"
                  label="Enable Gateway"
                  valuePropName="checked"
                >
                  <Checkbox>Enable this gateway</Checkbox>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="port"
              label="UDP Port"
              tooltip="BACnet standard port is 0xBAC0 (47808 in decimal)"
              rules={[{ required: true, message: 'Port is required' }]}
            >
              <HexPortInput />
            </Form.Item>

            <Form.Item
              name="apduTimeout"
              label="APDU Timeout (ms)"
              tooltip="Time to wait for responses from devices"
              rules={[{ required: true, message: 'Timeout is required' }]}
            >
              <InputNumber
                min={1000}
                step={100}
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Alert
              message="Port Configuration"
              description={(() => {
                const portValue = form.getFieldValue('port')
                const hex = portValue ? '0x' + portValue.toString(16).toUpperCase() : '0xBAC0'
                return `BACnet standard port: ${hex} (${portValue || 47808})`
              })()}
              type="info"
              showIcon
            />
          </Form>
        </Modal>
      </div>
    </Spin>
  )
}

export default BACnetGatewayManager
