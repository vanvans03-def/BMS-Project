/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * BACnet Gateway Network Configuration Component
 * 
 * This component manages the BACnet gateway (network) configuration
 * using the new /config/bacnet/network endpoint instead of the old
 * driver-based configuration stored in devices table.
 * 
 * Features:
 * - Gateway configuration (interface, port, timeout)
 * - Device management (link/unlink devices)
 * - Point configuration for each device
 * 
 * Port format: Decimal numbers (e.g., 47808, not 0xBAC0)
 */

import { useState, useEffect } from 'react'
import { Card, Form, Input, InputNumber, Button, Space, message, Typography, Alert, Row, Col, Spin, Tag, Divider, Badge, Tabs } from 'antd'
import { SaveOutlined, ReloadOutlined, ApiOutlined, WarningOutlined, DatabaseOutlined } from '@ant-design/icons'
import { authFetch } from '../../utils/authFetch'
import * as configService from '../../services/configService'
import DeviceManager from '../shared/DeviceManager'

const { Title, Text } = Typography

interface BACnetGatewaySettings {
  id: number
  name: string
  enable: boolean
  config: {
    interface: string
    port: number
    localDeviceId: number
    apduTimeout?: number
  }
}

export const BACnetGatewayNetworkSettings = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()
  const [gatewayData, setGatewayData] = useState<BACnetGatewaySettings | null>(null)
  const [isLoadingGateway, setIsLoadingGateway] = useState(true)

  useEffect(() => {
    loadGatewaySettings()
  }, [])

  const loadGatewaySettings = async () => {
    setIsLoadingGateway(true)
    try {
      const data = await configService.getBacnetNetwork()
      setGatewayData(data as any)
      
      // Set form values from the fetched data
      form.setFieldsValue({
        name: data.name,
        interface: data.config.interface || '0.0.0.0',
        port: data.config.port || 47808,
        localDeviceId: data.config.localDeviceId || 389001,
        apduTimeout: data.config.apduTimeout || 3000,
        enable: data.enable !== false
      })
    } catch (err: any) {
      console.error('Failed to load BACnet gateway settings:', err)
      messageApi.error('Failed to load BACnet gateway settings')
    } finally {
      setIsLoadingGateway(false)
    }
  }

  const onFinish = async (values: any) => {
    if (!gatewayData) {
      messageApi.error('Gateway configuration not found')
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: values.name,
        enable: values.enable !== false,
        config: {
          interface: values.interface || '0.0.0.0',
          port: values.port || 47808,
          localDeviceId: values.localDeviceId || 389001,
          apduTimeout: values.apduTimeout || 3000
        }
      }

      await configService.updateNetworkConfig(gatewayData.id, payload)
      messageApi.success('BACnet gateway configuration updated successfully')
      
      // Reload the settings
      await loadGatewaySettings()
    } catch (err: any) {
      console.error('Failed to save BACnet gateway settings:', err)
      messageApi.error(`Failed to save: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (isLoadingGateway) {
    return (
      <Card>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <Spin size="large" tip="Loading BACnet Gateway..." />
        </div>
      </Card>
    )
  }

  return (
    <Card title={<span><ApiOutlined /> BACnet Gateway Network</span>}>
      {contextHolder}

      <Alert
        message="Gateway Configuration"
        description="⚠️ Changes to Interface and Port require a backend restart. Modifying these settings will restart the BACnet service."
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        {/* Gateway Status */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ background: '#fafafa', border: '1px solid #f0f0f0' }}>
              <div style={{ textAlign: 'center' }}>
                <Badge 
                  status={gatewayData?.enable ? 'success' : 'error'} 
                  text={<Text strong>{gatewayData?.enable ? 'Enabled' : 'Disabled'}</Text>}
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ background: '#fafafa', border: '1px solid #f0f0f0' }}>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary">Gateway ID:</Text>
                <br />
                <Text strong>{gatewayData?.id}</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ background: '#fafafa', border: '1px solid #f0f0f0' }}>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary">Protocol:</Text>
                <br />
                <Tag color="blue">BACnet/IP</Tag>
              </div>
            </Card>
          </Col>
        </Row>

        <Divider />

        {/* Gateway Identity Section */}
        <div data-aos="fade-up">
          <Title level={5}><ApiOutlined /> Gateway Identity</Title>
          
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
                name="localDeviceId"
                label="Local Device ID"
                extra="Unique identifier for this gateway in BACnet network (0-4194303)"
                rules={[{ required: true, message: 'Device ID is required' }]}
              >
                <InputNumber 
                  style={{ width: '100%' }} 
                  min={0} 
                  max={4194303}
                  placeholder="389001"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="enable"
                label="Status"
                valuePropName="checked"
              >
                <div>
                  <Form.Item name="enable" valuePropName="checked" noStyle>
                    <input type="checkbox" style={{ marginRight: 8 }} />
                  </Form.Item>
                  <span>Enable this gateway</span>
                </div>
              </Form.Item>
            </Col>
          </Row>
        </div>

        <Divider />

        {/* Communication Settings */}
        <div data-aos="fade-up" data-aos-delay="100">
          <Title level={5}>Communication Settings</Title>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="interface"
                label="Network Interface"
                extra="IP address to bind to (0.0.0.0 = all interfaces)"
                rules={[{ required: true, message: 'Interface is required' }]}
              >
                <Input 
                  placeholder="0.0.0.0"
                  pattern="^(\d{1,3}\.){3}\d{1,3}$|0\.0\.0\.0"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="port"
                label="UDP Port"
                extra="BACnet standard port is 47808 (must be a number, not hex)"
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
              >
                <InputNumber 
                  style={{ width: '100%' }}
                  min={1}
                  max={65535}
                  placeholder="47808"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="apduTimeout"
                label="APDU Timeout (ms)"
                extra="Time to wait for responses from devices"
                rules={[{ required: true, message: 'Timeout is required' }]}
              >
                <InputNumber 
                  style={{ width: '100%' }}
                  min={1000}
                  step={100}
                  placeholder="3000"
                />
              </Form.Item>
            </Col>
          </Row>
        </div>

        <Divider />

        {/* Actions */}
        <div data-aos="fade-up" data-aos-delay="200">
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadGatewaySettings}
              disabled={loading}
            >
              Reload
            </Button>
            <Button 
              type="primary" 
              icon={<SaveOutlined />}
              htmlType="submit"
              loading={loading}
            >
              Save Gateway Configuration
            </Button>
          </Space>
        </div>

        {/* Info Box */}
        <Alert
          message="Port Format"
          description="All ports are now stored and displayed as decimal numbers (e.g., 47808) instead of hexadecimal (0xBAC0). This provides consistent port handling across all protocols."
          type="info"
          showIcon
          style={{ marginTop: 24 }}
        />
      </Form>
    </Card>
  )
}

export default BACnetGatewayNetworkSettings
