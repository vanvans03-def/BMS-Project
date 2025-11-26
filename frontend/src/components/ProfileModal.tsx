/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import { Modal, Form, Input, Button, Descriptions, Tag, message, Avatar, Divider, Row, Col, Space } from 'antd' // เพิ่ม Row, Col, Space
import { UserOutlined, MailOutlined, LockOutlined, SaveOutlined } from '@ant-design/icons'
// ตรวจสอบ path ให้แน่ใจว่าถูกต้อง (ถอย 1 ชั้นจาก components)
import { authFetch } from '../utils/authFetch'
import { useAuth } from '../contexts/AuthContext'

interface ProfileModalProps {
  open: boolean
  onClose: () => void
}

export const ProfileModal = ({ open, onClose }: ProfileModalProps) => {
  const { user } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [messageApi, contextHolder] = message.useMessage()

  useEffect(() => {
    if (open && user) {
      fetchProfile()
    }
  }, [open, user])

  const fetchProfile = async () => {
    try {
      // ดึงข้อมูล user ทั้งหมดแล้ว filter หาคนปัจจุบัน
      const res = await authFetch('/users')
      const users = await res.json()
      const currentUser = users.find((u: any) => u.id === user?.id)
      
      if (currentUser) {
        setUserData(currentUser)
        form.setFieldsValue({
          email: currentUser.email,
          password: '',
          confirmPassword: ''
        })
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    }
  }

  const handleUpdate = async (values: any) => {
    if (!user) return
    setLoading(true)
    try {
      const updateData: any = {
        email: values.email
      }

      if (values.password) {
        updateData.password = values.password
      }

      // ส่ง request แก้ไขข้อมูล
      const res = await authFetch(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })

      if (res.ok) {
        messageApi.success('Profile updated successfully')
        fetchProfile()
        // Clear password fields
        form.setFieldsValue({ password: '', confirmPassword: '' })
      } else {
        const error = await res.json()
        messageApi.error(error.message || 'Failed to update profile')
      }
    } catch (error) {
      messageApi.error('Update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="User Profile"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      {contextHolder}
      
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Avatar size={80} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff', marginBottom: 16 }} />
        <h2 style={{ margin: 0 }}>{userData?.username || user?.username}</h2>
        <Tag color={userData?.role === 'Admin' ? 'red' : 'blue'} style={{ marginTop: 8 }}>
          {userData?.role || user?.role}
        </Tag>
      </div>

      <Descriptions bordered column={1} size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Username">{userData?.username}</Descriptions.Item>
        <Descriptions.Item label="Role">{userData?.role}</Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color="success">Active</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Last Login">
          {userData?.last_login 
            ? new Date(userData.last_login).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) 
            : '-'}
        </Descriptions.Item>
      </Descriptions>

      <Divider>Edit Profile</Divider>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleUpdate}
      >
        <Form.Item
          name="email"
          label="Email Address"
          rules={[
            { type: 'email', message: 'Invalid email format' },
            { required: true, message: 'Please input your email!' }
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="your@email.com" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="password"
              label="New Password"
              rules={[
                {
                    // add rule to make password optional but min 6 chars if provided
                 }
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Leave blank to keep current" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="confirmPassword"
              label="Confirm Password"
              dependencies={['password']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('Passwords do not match!'))
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Confirm new password" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ textAlign: 'right', marginTop: 16 }}>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              Save Changes
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}