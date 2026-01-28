/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Device Configuration Manager
 * 
 * Manages device-to-network linkage and device-specific settings
 * using the new /config/devices/:deviceId endpoint.
 * 
 * Features:
 * - Link devices to networks
 * - Configure device-specific settings (unitId, byteOrder, etc.)
 * - Reassign devices between networks
 */

import { Modal, Form, Input, InputNumber, Select, Button, Space, message, Tag, Row, Col, Card, Typography, Alert, Spin } from 'antd'
import { useState, useEffect } from 'react'
import * as configService from '../../services/configService'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

interface DeviceConfigurationModalProps {
  open: boolean
  onClose: () => void
  onSave: () => void
  deviceId: number | null
  deviceName?: string
  protocol?: 'BACNET' | 'MODBUS'
}

export const DeviceConfigurationModal = ({
  open,
  onClose,
  onSave,
  deviceId,
  deviceName = 'Device',
  protocol = 'MODBUS'
}: DeviceConfigurationModalProps) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [networks, setNetworks] = useState<configService.NetworkConfig[]>([])
  const [deviceConfig, setDeviceConfig] = useState<configService.DeviceConfig | null>(null)
  const [mode, setMode] = useState<'form' | 'json'>('form')
  const [jsonValue, setJsonValue] = useState('')

  useEffect(() => {
    if (open && deviceId) {
      loadDeviceConfig()
      loadNetworks()
    }
  }, [open, deviceId])

  const loadDeviceConfig = async () => {
    if (!deviceId) return
    setLoadingData(true)
    try {
      const config = await configService.getDeviceConfig(deviceId)
      setDeviceConfig(config)

      if (config) {
        form.setFieldsValue({
          network_config_id: config.network_config_id || undefined,
          config: config.config || {}
        })
        setJsonValue(JSON.stringify(config.config || {}, null, 2))
      } else {
        form.resetFields()
        setJsonValue('{}')
      }
    } catch (err) {
      console.error('Failed to load device config:', err)
    } finally {
      setLoadingData(false)
    }
  }

  const loadNetworks = async () => {
    try {
      let data: configService.NetworkConfig[] = []

      if (protocol === 'BACNET') {
        const res = await configService.getBacnetNetwork()
        if (res && res.network) {
          data = [res.network]
        }
      } else {
        const res = await configService.getModbusNetworks()
        // Check if res is array of wrappers or flat configs
        // Based on backend service, it returns [{ network, devices }]
        if (Array.isArray(res)) {
          data = res.map((item: any) => item.network || item).filter(Boolean)
        }
      }

      setNetworks(data)
    } catch (err) {
      console.error('Failed to load networks:', err)
    }
  }

  const handleSave = async () => {
    if (!deviceId) {
      message.error('Device ID is missing')
      return
    }

    try {
      setLoading(true)
      let configData = {}

      if (mode === 'json') {
        try {
          configData = JSON.parse(jsonValue)
        } catch (e) {
          message.error('Invalid JSON format')
          setLoading(false)
          return
        }
      } else {
        const values = await form.validateFields()
        configData = values.config || {}
      }

      const networkId = form.getFieldValue('network_config_id')

      if (deviceConfig) {
        // Update existing
        await configService.updateDeviceConfig(deviceId, {
          network_config_id: networkId || undefined,
          config: configData
        })
      } else {
        // Create new
        await configService.createDeviceConfig(
          deviceId,
          networkId || null,
          configData
        )
      }

      message.success('Device configuration saved')
      onSave()
      onClose()
    } catch (err: any) {
      console.error('Failed to save device config:', err)
      message.error(`Failed to save: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={`Device Configuration: ${deviceName}`}
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okButtonProps={{ loading }}
      width={700}
    >
      <Spin spinning={loadingData}>
        <Alert
          message="Device Configuration"
          description="Link this device to a network and configure device-specific settings (unitId, byteOrder, etc.)"
          type="info"
          style={{ marginBottom: 16 }}
          showIcon
        />

        <Form form={form} layout="vertical">
          {/* Network Linkage */}
          <Card size="small" style={{ marginBottom: 16 }} title="Network Linkage">
            <Form.Item
              name="network_config_id"
              label="Network Configuration"
              tooltip="Link this device to a network (gateway)"
              rules={[{ required: true, message: 'Network is required' }]}
            >
              <Select placeholder="Select a network...">
                <Option value={undefined}>None (Not linked)</Option>
                {networks.map(net => (
                  <Option key={net.id} value={net.id}>
                    <Tag color={net.protocol === 'BACNET' ? 'blue' : 'orange'}>
                      {net.protocol}
                    </Tag>
                    {net.name} (ID: {net.id})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Card>

          {/* Mode Toggle */}
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Text strong>Configuration Mode:</Text>
              <Button
                type={mode === 'form' ? 'primary' : 'default'}
                size="small"
                onClick={() => setMode('form')}
              >
                Form
              </Button>
              <Button
                type={mode === 'json' ? 'primary' : 'default'}
                size="small"
                onClick={() => setMode('json')}
              >
                JSON
              </Button>
            </Space>
          </div>

          {/* Form Mode */}
          {mode === 'form' && (
            <Card size="small" title="Device Settings">
              {protocol === 'MODBUS' && (
                <>
                  <Row gutter={16}>
                    <Col xs={12}>
                      <Form.Item
                        name={['config', 'unitId']}
                        label="Unit ID"
                        tooltip="Modbus Unit ID (0-247)"
                      >
                        <InputNumber min={0} max={247} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12}>
                      <Form.Item
                        name={['config', 'byteOrder']}
                        label="Byte Order"
                        tooltip="Byte order for multi-register values"
                      >
                        <Select>
                          <Option value="ABCD">ABCD</Option>
                          <Option value="BADC">BADC</Option>
                          <Option value="CDAB">CDAB</Option>
                          <Option value="DCBA">DCBA</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    name={['config', 'description']}
                    label="Description"
                  >
                    <TextArea rows={2} placeholder="Device description..." />
                  </Form.Item>
                </>
              )}

              {protocol === 'BACNET' && (
                <>
                  <Row gutter={16}>
                    <Col xs={12}>
                      <Form.Item
                        name={['config', 'deviceInstance']}
                        label="Device Instance"
                        tooltip="BACnet device instance number"
                      >
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12}>
                      <Form.Item
                        name={['config', 'networkNumber']}
                        label="Network Number"
                      >
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    name={['config', 'description']}
                    label="Description"
                  >
                    <TextArea rows={2} placeholder="Device description..." />
                  </Form.Item>
                </>
              )}
            </Card>
          )}

          {/* JSON Mode */}
          {mode === 'json' && (
            <Card size="small" title="JSON Configuration">
              <Form.Item
                label="Configuration JSON"
                extra="Provide custom configuration as JSON"
              >
                <TextArea
                  value={jsonValue}
                  onChange={(e) => setJsonValue(e.target.value)}
                  rows={8}
                  placeholder='{}'
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>
            </Card>
          )}

          {/* Info */}
          <Alert
            message="Device-Network Linkage"
            description="This configuration links the device to a specific network (gateway) and stores device-specific settings like Unit ID or Byte Order."
            type="info"
            style={{ marginTop: 16 }}
            showIcon
          />
        </Form>
      </Spin>
    </Modal>
  )
}

export default DeviceConfigurationModal
