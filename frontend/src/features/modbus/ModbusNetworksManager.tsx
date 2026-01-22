/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Modbus Networks Configuration Component
 * 
 * Displays and manages all Modbus networks (gateways) using the new
 * /config/modbus/networks endpoint.  
 * 
 * Features:
 * - Lists all Modbus networks (TCP and Serial)
 * - Shows network configuration (protocol, port, connection type)
 * - Allows enabling/disabling networks
 * - Shows connected devices for each network
 * - Port format: Decimal numbers (e.g., 502, not "502")
 */

import { useState, useEffect } from 'react'
import { Card, Table, Tag, Badge, Button, Space, Typography, Row, Col, Modal, Form, Input, InputNumber, Select, message, Tooltip, Spin, Alert } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined, GlobalOutlined, DatabaseOutlined, WifiOutlined } from '@ant-design/icons'
import * as configService from '../../services/configService'

const { Text, Title } = Typography
const { Option } = Select

interface ModbusNetwork extends configService.NetworkConfig {
  devices?: any[]
}

export const ModbusNetworksManager = () => {
  const [networks, setNetworks] = useState<ModbusNetwork[]>([])
  const [loading, setLoading] = useState(true)
  const [messageApi, contextHolder] = message.useMessage()

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNetwork, setEditingNetwork] = useState<ModbusNetwork | null>(null)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadNetworks()
  }, [])

  const loadNetworks = async () => {
    setLoading(true)
    try {
      const data = await configService.getModbusNetworks()
      setNetworks(data || [])
    } catch (err: any) {
      console.error('Failed to load Modbus networks:', err)
      messageApi.error('Failed to load Modbus networks')
    } finally {
      setLoading(false)
    }
  }

  const handleAddNetwork = () => {
    setEditingNetwork(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEdit = (network: ModbusNetwork) => {
    setEditingNetwork(network)
    form.setFieldsValue({
      name: network.name,
      enable: network.enable,
      protocol_type: network.config.type || 'TCP',
      host: network.config.host || '',
      port: network.config.port || 502,
      serial_port: network.config.port || '',
      baud_rate: network.config.baudRate || 9600,
    })
    setIsModalOpen(true)
  }

  const handleSave = async (values: any) => {
    setSaving(true)
    try {
      const config = {
        type: values.protocol_type,
        ...(values.protocol_type === 'TCP'
          ? { host: values.host, port: values.port || 502 }
          : { port: values.serial_port, baudRate: values.baud_rate || 9600 })
      }

      if (editingNetwork) {
        await configService.updateNetworkConfig(editingNetwork.id, {
          name: values.name,
          enable: values.enable,
          config
        })
        messageApi.success('Network updated successfully')
      } else {
        await configService.createNetworkConfig(
          values.name,
          'MODBUS',
          config,
          values.enable
        )
        messageApi.success('Network created successfully')
      }

      setIsModalOpen(false)
      await loadNetworks()
    } catch (err: any) {
      console.error('Failed to save network:', err)
      messageApi.error(`Failed to save: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await configService.deleteNetworkConfig(id)
      messageApi.success('Network deleted successfully')
      await loadNetworks()
    } catch (err: any) {
      console.error('Failed to delete network:', err)
      messageApi.error(`Failed to delete: ${err.message}`)
    }
  }

  const columns: ColumnsType<ModbusNetwork> = [
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <Badge
          status={record.enable ? 'success' : 'error'}
          text={record.enable ? 'Enabled' : 'Disabled'}
        />
      )
    },
    {
      title: 'Network Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Type',
      key: 'type',
      render: (_, record) => (
        <Tag color={record.config.type === 'TCP' ? 'blue' : 'purple'}>
          {record.config.type === 'TCP' ? 'TCP' : 'Serial'}
        </Tag>
      )
    },
    {
      title: 'Configuration',
      key: 'config',
      render: (_, record) => {
        if (record.config.type === 'TCP') {
          return (
            <Space direction="vertical" size={0}>
              <div>
                <GlobalOutlined /> {record.config.host}:{record.config.port || 502}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Port Format: Decimal ({record.config.port || 502})
              </Text>
            </Space>
          )
        } else {
          return (
            <Space direction="vertical" size={0}>
              <div>
                <DatabaseOutlined /> {record.config.port}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.config.baudRate || 9600} baud
              </Text>
            </Space>
          )
        }
      }
    },
    {
      title: 'Devices',
      key: 'devices',
      render: (_, record) => (
        <Badge
          count={record.devices?.length || 0}
          style={{ backgroundColor: '#52c41a' }}
        />
      )
    },
    {
      title: 'Action',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: 'Delete Network',
                  content: `Are you sure you want to delete "${record.name}"? All devices under this network will be affected.`,
                  okText: 'Delete',
                  okType: 'danger',
                  onOk: () => handleDelete(record.id)
                })
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ]

  return (
    <div data-aos="fade-up">
      {contextHolder}

      <Card
        title={<span><WifiOutlined /> Modbus Networks</span>}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadNetworks} disabled={loading} />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNetwork}>
              New Network
            </Button>
          </Space>
        }
      >
        <Alert
          message="Port Format"
          description="All Modbus ports are now displayed and stored as decimal numbers (e.g., 502, 5020) instead of strings or hex format. Default Modbus TCP port is 502."
          type="info"
          style={{ marginBottom: 16 }}
          showIcon
        />

        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={networks}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'No networks configured' }}
          />
        </Spin>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingNetwork ? 'Edit Modbus Network' : 'Add Modbus Network'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={form.submit}
        okButtonProps={{ loading: saving }}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            name="name"
            label="Network Name"
            rules={[{ required: true, message: 'Network name is required' }]}
          >
            <Input placeholder="e.g., Modbus Gateway 1" />
          </Form.Item>

          <Form.Item
            name="enable"
            label="Enable"
            valuePropName="checked"
          >
            <input type="checkbox" />
          </Form.Item>

          <Form.Item
            name="protocol_type"
            label="Connection Type"
            rules={[{ required: true, message: 'Connection type is required' }]}
          >
            <Select>
              <Option value="TCP">TCP</Option>
              <Option value="SERIAL">Serial</Option>
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.protocol_type !== currentValues.protocol_type}>
            {({ getFieldValue }) =>
              getFieldValue('protocol_type') === 'TCP' ? (
                <>
                  <Form.Item
                    name="host"
                    label="Host/IP Address"
                    rules={[{ required: true, message: 'Host is required' }]}
                  >
                    <Input placeholder="192.168.1.100" />
                  </Form.Item>

                  <Form.Item
                    name="port"
                    label="Port (Decimal Format)"
                    rules={[
                      { required: true, message: 'Port is required' },
                      {
                        validator: (_, value) => {
                          if (value && value > 65535) {
                            return Promise.reject(new Error('Port must be ≤ 65535'))
                          }
                          return Promise.resolve()
                        }
                      }
                    ]}
                    tooltip="Port must be a decimal number (e.g., 502, 5020) not a hex value"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={1}
                      max={65535}
                      placeholder="502"
                    />
                  </Form.Item>
                </>
              ) : (
                <>
                  <Form.Item
                    name="serial_port"
                    label="Serial Port"
                    rules={[{ required: true, message: 'Serial port is required' }]}
                  >
                    <Input placeholder="/dev/ttyUSB0 or COM1" />
                  </Form.Item>

                  <Form.Item
                    name="baud_rate"
                    label="Baud Rate"
                    rules={[{ required: true, message: 'Baud rate is required' }]}
                  >
                    <Select>
                      <Option value={9600}>9600</Option>
                      <Option value={19200}>19200</Option>
                      <Option value={38400}>38400</Option>
                      <Option value={57600}>57600</Option>
                      <Option value={115200}>115200</Option>
                    </Select>
                  </Form.Item>
                </>
              )
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ModbusNetworksManager
