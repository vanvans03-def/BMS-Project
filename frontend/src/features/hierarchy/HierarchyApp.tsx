import { useState, useEffect } from "react"
import { Layout, Card, Typography, Divider } from "antd"
import { ApartmentOutlined } from "@ant-design/icons"
import AOS from 'aos'
import { DashboardLayout } from "../../components/layout/DashboardLayout"

import { LocationTreePanel } from "./LocationTreePanel"
import { UnassignedDevicesPanel } from "./UnassignedDevicesPanel"
import { DeviceConfigPanel } from "./DeviceConfigPanel"

const { Content, Sider } = Layout
const { Title, Text } = Typography

// Placeholders removed


interface HierarchyAppProps {
    onBack: () => void
    onNavigate: (system: 'BACNET' | 'MODBUS', deviceId: number) => void
}

export default function HierarchyApp({ onBack, onNavigate }: HierarchyAppProps) {
    const [selectedLocation, setSelectedLocation] = useState<any>(null)
    const [refreshTrigger, setRefreshTrigger] = useState(0)


    const triggerRefresh = () => setRefreshTrigger(prev => prev + 1)

    useEffect(() => {
        AOS.refresh()
    }, [selectedLocation])

    return (
        <DashboardLayout
            title="Hierarchy Manager"
            headerIcon={<ApartmentOutlined />}
            themeColor="#eb2f96"
            onBack={onBack}
            showMenu={false}
            currentView="hierarchy"
            onMenuClick={() => { }}
        >

            <Layout style={{ height: 'calc(100vh - 100px)', padding: 12, background: 'transparent' }}>
                {/* Panel A: Tree */}
                <Sider
                    width={300}
                    theme="light"
                    style={{ marginRight: 12, borderRadius: 8, overflow: 'hidden' }}
                    data-aos="fade-right"
                    data-aos-delay="100"
                >
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
                        <Text strong>Hierarchy Structure</Text>
                    </div>
                    <LocationTreePanel onSelectLocation={setSelectedLocation} />
                </Sider>

                {/* Center: Config */}
                <Content style={{ marginRight: 12 }}>
                    <Card
                        key={selectedLocation?.id || 'init'}
                        data-aos="fade-up"
                        style={{ height: '100%', borderRadius: 8, overflowY: 'auto' }}
                        bodyStyle={{ padding: 24 }}
                    >
                        <div style={{ marginBottom: 16 }}>
                            <Title level={4} style={{ margin: 0 }}>
                                {selectedLocation ? selectedLocation.name : 'Context Configuration'}
                            </Title>
                            <Text type="secondary">Manage history settings and context</Text>
                        </div>
                        <Divider style={{ margin: '12px 0' }} />
                        <DeviceConfigPanel
                            selectedLocation={selectedLocation}
                            refreshTrigger={refreshTrigger}
                            onNavigate={onNavigate}
                        />
                    </Card>
                </Content>

                {/* Panel B: Unassigned Pool (Right Sider) */}
                <Sider
                    width={280}
                    theme="light"
                    style={{ borderRadius: 8, overflow: 'hidden' }}
                    data-aos="fade-left"
                    data-aos-delay="300"
                >
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
                        <Text strong>Unassigned Devices</Text>
                    </div>
                    <UnassignedDevicesPanel
                        selectedLocation={selectedLocation}
                        onAssignSuccess={triggerRefresh}
                    />
                </Sider>
            </Layout>
        </DashboardLayout>
    )
}
