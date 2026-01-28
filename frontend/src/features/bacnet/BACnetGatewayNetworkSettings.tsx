/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react'
import { Card, Form, Input, InputNumber, Button, Space, message, Typography, Alert, Row, Col, Spin, Tag, Divider, Badge, Select } from 'antd'
import { SaveOutlined, ReloadOutlined, ApiOutlined } from '@ant-design/icons'
import * as configService from '../../services/configService'

const { Title, Text } = Typography
const { Option } = Select

interface BACnetGatewaySettings {
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

// Use type from configService
// interface NetworkInterface {
//   name: string
//   ip: string
// }

export const BACnetGatewayNetworkSettings = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()
  const [gatewayData, setGatewayData] = useState<BACnetGatewaySettings | null>(null)
  const [isLoadingGateway, setIsLoadingGateway] = useState(true)

  // State สำหรับเก็บรายการ Network Interfaces
  const [interfaces, setInterfaces] = useState<configService.NetworkInterface[]>([])

  useEffect(() => {
    loadGatewaySettings()
    loadNetworkInterfaces()
  }, [])

  // ฟังก์ชันดึงข้อมูล Network Interfaces
  const loadNetworkInterfaces = async () => {
    try {
      // ใช้ configService ดึงข้อมูลแทนการ fetch เอง
      const data = await configService.getNetworkInterfaces()
      setInterfaces(data)
    } catch (error) {
      console.error('Failed to load network interfaces:', error)
      messageApi.error('Failed to load network interfaces')
    }
  }

  const loadGatewaySettings = async () => {
    setIsLoadingGateway(true)
    try {
      const res = await configService.getBacnetNetwork()

      // [FIX] Handle Array (Multi-Gateway) - Just pick the first enabled one for this detailed view
      // Or picking the first one in the list.
      let data: any = null;

      if (Array.isArray(res) && res.length > 0) {
        data = res[0].network;
      } else if (res && (res as any).network) {
        data = (res as any).network;
      }

      if (data) {
        setGatewayData(data as any)

        form.setFieldsValue({
          name: data.name,
          interface: data.config?.interface || '0.0.0.0',
          ip: data.config?.ip || '',
          port: data.config?.port || 47808,
          localDeviceId: data.config?.localDeviceId || 389001,
          apduTimeout: data.config?.apduTimeout || 3000,
          enable: data.enable !== false
        })
      }
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
          ip: values.ip,
          port: values.port || 47808,
          localDeviceId: values.localDeviceId || 389001,
          apduTimeout: values.apduTimeout || 3000
        }
      }

      await configService.updateNetworkConfig(gatewayData.id, payload)
      messageApi.success('BACnet gateway configuration updated successfully')
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
        description="⚠️ Changes to Interface and Port require a backend restart."
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        {/* ... (Gateway Status Section - เหมือนเดิม) ... */}
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

        <div data-aos="fade-up">
          <Title level={5}><ApiOutlined /> Gateway Identity</Title>
          <Form.Item name="name" label="Gateway Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="localDeviceId" label="Local Device ID" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} max={4194303} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="enable" label="Status" valuePropName="checked">
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

        <div data-aos="fade-up" data-aos-delay="100">
          <Title level={5}>Communication Settings</Title>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="interface"
                label="Network Interface"
                extra="Select the interface to bind BACnet service"
                rules={[{ required: true, message: 'Interface is required' }]}
              >
                <Select
                  placeholder="Select Interface"
                  onChange={(val) => {
                    const iface = interfaces.find(i => i.name === val)
                    if (iface) {
                      form.setFieldsValue({ ip: iface.ip })
                    } else if (val === '0.0.0.0') {
                      form.setFieldsValue({ ip: '0.0.0.0' })
                    }
                  }}
                >
                  <Option value="0.0.0.0">All Interfaces (0.0.0.0)</Option>
                  {interfaces.map((iface) => (
                    <Option key={iface.name} value={iface.name}>
                      {iface.name} - {iface.ip}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="ip"
                label="Interface IP"
                rules={[{ required: true, message: 'IP is required' }]}
              >
                <Input placeholder="Interface IP" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="port"
                label="UDP Port"
                extra="Standard: 0xBAC0 (47808)"
                rules={[{ required: true }]}
              >
                {/* [FIX] เพิ่ม <number> เพื่อบอก TypeScript ว่ารับค่าตัวเลขทั้งหมด ไม่ใช่แค่ 1 หรือ 65535 */}
                <InputNumber<number>
                  style={{ width: '100%' }}
                  min={1}
                  max={65535}
                  step={1}
                  formatter={(value) => {
                    const val = Number(value);
                    if (isNaN(val) || value === null || value === undefined) return '';
                    // แสดงผลแบบ HEX (Decimal)
                    return `0x${val.toString(16).toUpperCase()} (${val})`;
                  }}
                  parser={(displayValue) => {
                    if (!displayValue) return 0;
                    const valStr = displayValue.toString();

                    // 1. ลองดึงค่าในวงเล็บก่อน (กรณี format มาแล้ว) เช่น 0xBAC0 (47808)
                    const match = valStr.match(/\((\d+)\)/);
                    if (match) return Number(match[1]);

                    // 2. ถ้าผู้ใช้พิมพ์ Hex (ขึ้นต้นด้วย 0x)
                    if (valStr.trim().toLowerCase().startsWith('0x')) {
                      return parseInt(valStr, 16);
                    }

                    // 3. ถ้าพิมพ์ตัวเลขธรรมดา
                    const parsed = Number(valStr.replace(/[^\d]/g, ''));
                    return isNaN(parsed) ? 0 : parsed;
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="apduTimeout" label="APDU Timeout (ms)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1000} step={100} />
              </Form.Item>
            </Col>
          </Row>
        </div>

        <Divider />

        <div data-aos="fade-up" data-aos-delay="200">
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button icon={<ReloadOutlined />} onClick={() => { loadGatewaySettings(); loadNetworkInterfaces(); }} disabled={loading}>
              Reload
            </Button>
            <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={loading}>
              Save Gateway Configuration
            </Button>
          </Space>
        </div>
      </Form>
    </Card>
  )
}

export default BACnetGatewayNetworkSettings