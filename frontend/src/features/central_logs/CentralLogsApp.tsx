import { useState } from 'react'
import { Card, theme } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import { LogsPage } from '../../components/LogsPage'
import { ProfileModal } from '../../components/ProfileModal'
import { DashboardLayout } from '../../components/layout/DashboardLayout'

interface CentralLogsAppProps {
  onBack: () => void
  onNavigate?: (key: string) => void
}

export default function CentralLogsApp({ onBack, onNavigate }: CentralLogsAppProps) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  return (
    <DashboardLayout
      title="Central Logs"
      headerIcon={<FileTextOutlined />}
      themeColor="#722ed1"
      onBack={onBack}
      currentView="logs"
      onMenuClick={() => { }}
      showMenu={false} // Logs usually full width or specific internal internal menu
      onProfileClick={() => setIsProfileModalOpen(true)}
      headerActions={null}
      onNavigate={onNavigate as any}
    >
      <Card>
        <LogsPage />
      </Card>

      <ProfileModal open={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </DashboardLayout>
  )
}