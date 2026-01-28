import { useState, useEffect } from "react"
import { Layout, Card, Typography, Divider, Switch } from "antd"
import { ApartmentOutlined } from "@ant-design/icons"
import AOS from 'aos'
import { DashboardLayout } from "../../components/layout/DashboardLayout"

import { LocationTreePanel } from "./LocationTreePanel"
import { DeviceConfigPanel } from "./DeviceConfigPanel"

const { Content, Sider } = Layout
const { Title, Text } = Typography

interface HierarchyAppProps {
    onBack: () => void
    onNavigate: (system: 'BACNET' | 'MODBUS', deviceId: number) => void
    embedded?: boolean
}

export default function HierarchyApp({ onBack, onNavigate, embedded = false }: HierarchyAppProps) {
    const [selectedLocation, setSelectedLocation] = useState<any>(null)
    const [showHistoryOnly, setShowHistoryOnly] = useState(false)

    useEffect(() => { AOS.refresh() }, [selectedLocation])

    const content = (
        <Layout style={{ height: embedded ? '100%' : 'calc(100vh - 64px)', padding: 0, background: 'transparent' }}>
            {/* Panel A: Tree */}
            <Sider
                width={320}
                theme="light"
                style={{ borderRight: '1px solid #f0f0f0', background: '#fff' }}
                data-aos={embedded ? undefined : "fade-right"}
            >
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>Hierarchy</Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Show History</Text>
                        <Switch size="small" checked={showHistoryOnly} onChange={setShowHistoryOnly} />
                    </div>
                </div>
                <LocationTreePanel onSelectLocation={setSelectedLocation} showHistoryOnly={showHistoryOnly} />
            </Sider>

            {/* Panel B: Content Detail (Device/Point) */}
            <Content style={{ padding: 24, overflowY: 'auto' }}>
                <Card
                    key={selectedLocation?.id || 'init'}
                    data-aos={embedded ? undefined : "fade-up"}
                    style={{ minHeight: '100%', borderRadius: 8 }}
                    bodyStyle={{ padding: 24 }}
                >
                    {!selectedLocation ? (
                        <div style={{ textAlign: 'center', marginTop: '20%', color: '#ccc' }}>
                            <ApartmentOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                            <div>Select a Device or Point from the tree</div>
                        </div>
                    ) : (
                        <DeviceConfigPanel
                            selectedLocation={selectedLocation}
                            onNavigate={onNavigate}
                            showHistoryOnly={showHistoryOnly}
                            onSelectNode={setSelectedLocation}
                        />
                    )}
                </Card>
            </Content>
        </Layout>
    )

    if (embedded) return content
    return (
        <DashboardLayout
            title="Hierarchy Manager"
            headerIcon={<ApartmentOutlined />}
            themeColor="#eb2f96"
            onBack={onBack}
            showMenu={false}
            currentView="hierarchy"
            onMenuClick={() => { }}
            contentStyle={{ padding: 0, background: 'transparent' }}
        >
            {content}
        </DashboardLayout>
    )
}
