import { useState } from 'react'
import { Card, theme } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import { LogsPage } from '../../components/LogsPage'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { ProfileModal } from '../../components/ProfileModal'

interface CentralLogsAppProps {
  onBack: () => void
  onNavigate?: (system: 'BACNET' | 'MODBUS' | 'LOGS' | 'HIERARCHY' | 'GLOBAL_SETTINGS', view?: string) => void
}

export default function CentralLogsApp({ onBack, onNavigate }: CentralLogsAppProps) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken()

  return (
    <DashboardLayout
      title="Central Logs"
      headerIcon={<FileTextOutlined />}
      themeColor="#722ed1"
      currentView="logs"
      onBack={onBack}
      onMenuClick={() => { }}
      showMenu={false}
      onSystemSelect={onNavigate}
      onProfileClick={() => setIsProfileModalOpen(true)}
    >
      <LogsPage />
      <ProfileModal open={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </DashboardLayout>
  )
}