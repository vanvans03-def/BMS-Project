/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Point Configuration Manager
 * 
 * Manages point-specific settings and metadata using the
 * /config/points/:pointId endpoint.
 * 
 * Features:
 * - Edit point metadata (objectType, registerType, dataType, dataFormat)
 * - Configure point-specific parameters
 * - JSON mode for advanced configurations
 */

import { Modal, Form, Input, Select, Button, Space, message, Tag, Row, Col, Card, Typography, Alert, Spin, InputNumber } from 'antd'
import { useState, useEffect } from 'react'
import * as configService from '../../services/configService'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

interface PointConfigurationModalProps {
  open: boolean
  onClose: () => void
  onSave: () => void
  pointId: number | null
  pointName?: string
  deviceId?: number
}

export const PointConfigurationModal = ({
  open,
  onClose,
  onSave,
  pointId,
  pointName = 'Point',
  deviceId
}: PointConfigurationModalProps) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [pointConfig, setPointConfig] = useState<configService.PointConfig | null>(null)
  const [mode, setMode] = useState<'form' | 'json'>('form')
  const [jsonValue, setJsonValue] = useState('')

  useEffect(() => {
    if (open && pointId) {
      loadPointConfig()
    }
  }, [open, pointId])

  const loadPointConfig = async () => {
    if (!pointId) return
    setLoadingData(true)
    try {
      const config = await configService.getPointConfig(pointId)
      setPointConfig(config)

      if (config) {
        form.setFieldsValue(config.config || {})
        setJsonValue(JSON.stringify(config.config || {}, null, 2))
      } else {
        form.resetFields()
        setJsonValue('{}')
      }
    } catch (err) {
      console.error('Failed to load point config:', err)
    } finally {
      setLoadingData(false)
    }
  }

  const handleSave = async () => {
    if (!pointId) {
      message.error('Point ID is missing')
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
        configData = values
      }

      if (pointConfig) {
        // Update existing
        await configService.updatePointConfig(pointId, configData)
      } else {
        // Create new
        await configService.createPointConfig(pointId, configData)
      }

      message.success('Point configuration saved')
      onSave()
      onClose()
    } catch (err: any) {
      console.error('Failed to save point config:', err)
      message.error(`Failed to save: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={`Point Configuration: ${pointName}`}
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okButtonProps={{ loading }}
      width={700}
    >
      <Spin spinning={loadingData}>
        <Alert
          message="Point Configuration"
          description="Configure point-specific metadata including object type, register information, data type, and format."
          type="info"
          style={{ marginBottom: 16 }}
          showIcon
        />

        <Form form={form} layout="vertical">
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
            <Card size="small" title="Point Settings">
              <Row gutter={16}>
                <Col xs={12}>
                  <Form.Item
                    name="objectType"
                    label="Object Type"
                    tooltip="BACnet object type (e.g., analogInput, digitalOutput)"
                  >
                    <Input placeholder="e.g., analogInput" />
                  </Form.Item>
                </Col>
                <Col xs={12}>
                  <Form.Item
                    name="objectInstance"
                    label="Object Instance"
                    tooltip="BACnet object instance number"
                  >
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={12}>
                  <Form.Item
                    name="registerType"
                    label="Register Type"
                    tooltip="Modbus register type"
                  >
                    <Select placeholder="Select register type...">
                      <Option value="coil">Coil</Option>
                      <Option value="discrete_input">Discrete Input</Option>
                      <Option value="holding_register">Holding Register</Option>
                      <Option value="input_register">Input Register</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={12}>
                  <Form.Item
                    name="registerAddress"
                    label="Register Address"
                    tooltip="Modbus register starting address"
                  >
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={12}>
                  <Form.Item
                    name="dataType"
                    label="Data Type"
                    tooltip="Data type for this point"
                  >
                    <Select placeholder="Select data type...">
                      <Option value="boolean">Boolean</Option>
                      <Option value="int16">Int16</Option>
                      <Option value="uint16">UInt16</Option>
                      <Option value="int32">Int32</Option>
                      <Option value="uint32">UInt32</Option>
                      <Option value="float">Float</Option>
                      <Option value="double">Double</Option>
                      <Option value="string">String</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={12}>
                  <Form.Item
                    name="dataFormat"
                    label="Data Format"
                    tooltip="Data format or encoding"
                  >
                    <Input placeholder="e.g., IEEE754, BCD" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={12}>
                  <Form.Item
                    name="scale"
                    label="Scale"
                    tooltip="Scaling factor for the value"
                  >
                    <InputNumber step={0.01} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={12}>
                  <Form.Item
                    name="offset"
                    label="Offset"
                    tooltip="Offset to add to the value"
                  >
                    <InputNumber step={0.01} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={12}>
                  <Form.Item
                    name="unit"
                    label="Unit"
                    tooltip="Measurement unit for this point"
                  >
                    <Input placeholder="e.g., °C, kW, m/s" />
                  </Form.Item>
                </Col>
                <Col xs={12}>
                  <Form.Item
                    name="precision"
                    label="Precision (Decimals)"
                    tooltip="Number of decimal places to display"
                  >
                    <InputNumber min={0} max={10} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="description"
                label="Description"
              >
                <TextArea rows={2} placeholder="Point description..." />
              </Form.Item>

              <Form.Item
                name="notes"
                label="Notes"
              >
                <TextArea rows={2} placeholder="Additional notes..." />
              </Form.Item>
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
                  rows={10}
                  placeholder='{}'
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>
            </Card>
          )}

          {/* Info */}
          <Alert
            message="Point Configuration"
            description="Point configuration stores metadata about individual points including register type, data type, scaling, and units. This data is used for proper interpretation and display of point values."
            type="info"
            style={{ marginTop: 16 }}
            showIcon
          />
        </Form>
      </Spin>
    </Modal>
  )
}

export default PointConfigurationModal
