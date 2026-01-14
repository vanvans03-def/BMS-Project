import { useState } from 'react'
import { Card, Tabs } from 'antd'
import {
    UserOutlined,
    ClusterOutlined
} from '@ant-design/icons'

import { DashboardLayout } from '../../components/layout/DashboardLayout'
import HierarchyApp from '../hierarchy/HierarchyApp'
import { UserSettings } from '../../components/SettingsTabs'

interface GlobalSettingsAppProps {
    onBack: () => void
    onNavigate?: (system: 'BACNET' | 'MODBUS', deviceId: number) => void
    initialTab?: string
}

export default function GlobalSettingsApp({ onBack, onNavigate, initialTab = 'hierarchy' }: GlobalSettingsAppProps) {
    const [activeTab, setActiveTab] = useState(initialTab)

    return (
        <DashboardLayout
            title="Global Settings"
            headerIcon={<ClusterOutlined />}
            themeColor="#eb2f96"
            onBack={onBack}
            showMenu={false}
            currentView="global-settings"
            onMenuClick={() => { }}
        >
            <Card>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        {
                            key: 'hierarchy',
                            label: <span><ClusterOutlined /> Hierarchy</span>,
                            children: <HierarchyApp onBack={() => { }} onNavigate={onNavigate || (() => { })} embedded />
                        },
                        {
                            key: 'users',
                            label: <span><UserOutlined /> User Management</span>,
                            children: <UserSettings />
                        }
                    ]}
                />
            </Card>
        </DashboardLayout>
    )
}
