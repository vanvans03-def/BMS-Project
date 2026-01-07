import React, { useState, useEffect } from 'react';
import { Table, DatePicker, Select, Button, Tag, Pagination, Card, Space, message } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface HistoryLog {
    timestamp: string;
    device_name: string;
    point_name: string;
    value: number;
    quality_code: string;
    object_type: string;
    object_instance: number;
}

const HistoryLogsPanel: React.FC = () => {
    const [logs, setLogs] = useState<HistoryLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Filters
    const [selectedDevice, setSelectedDevice] = useState<string | undefined>(undefined);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
    const [devices, setDevices] = useState<{ id: number, device_name: string }[]>([]);

    useEffect(() => {
        fetchDevices();
        fetchLogs();
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [currentPage, pageSize]); // Only auto-fetch on pagination change

    const fetchDevices = async () => {
        try {
            const token = localStorage.getItem('bms_token');
            const response = await axios.get('http://localhost:3000/devices', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDevices(response.data);
        } catch (error) {
            console.error('Failed to fetch devices', error);
        }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('bms_token');
            const params: any = {
                page: currentPage,
                limit: pageSize,
                deviceId: selectedDevice
            };

            if (dateRange) {
                params.startDate = dateRange[0].toISOString();
                params.endDate = dateRange[1].toISOString();
            }

            const response = await axios.get('http://localhost:3000/api/history-logs', {
                headers: { Authorization: `Bearer ${token}` },
                params
            });

            setLogs(response.data.data);
            setTotal(response.data.pagination.total);
        } catch (error) {
            console.error('Failed to fetch history logs', error);
            message.error('Failed to load history logs');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Timestamp',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
            width: 180,
        },
        {
            title: 'Device',
            dataIndex: 'device_name',
            key: 'device_name',
            width: 200,
        },
        {
            title: 'Point',
            dataIndex: 'point_name',
            key: 'point_name',
            render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>
        },
        {
            title: 'Value',
            dataIndex: 'value',
            key: 'value',
            render: (val: number) => <Tag color="blue" style={{ fontSize: 14 }}>{val}</Tag>
        },
        {
            title: 'Quality',
            dataIndex: 'quality_code',
            key: 'quality_code',
            render: (status: string) => (
                <Tag color={status === 'good' ? 'success' : 'error'}>
                    {status.toUpperCase()}
                </Tag>
            )
        }
    ];

    return (
        <Card title="History Logs" bordered={false} bodyStyle={{ padding: '0 24px 24px' }}>
            <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space>
                    <Select
                        showSearch
                        placeholder="Select Device"
                        style={{ width: 250 }}
                        allowClear
                        onChange={setSelectedDevice}
                        optionFilterProp="children"
                    >
                        {devices.map(d => (
                            <Option key={d.id} value={d.id}>{d.device_name}</Option>
                        ))}
                    </Select>

                    <RangePicker
                        showTime
                        onChange={(dates) => setDateRange(dates as any)}
                        style={{ width: 350 }}
                    />

                    <Button
                        type="primary"
                        icon={<SearchOutlined />}
                        onClick={() => { setCurrentPage(1); fetchLogs(); }}
                    >
                        Search
                    </Button>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchLogs}
                    >
                        Refresh
                    </Button>
                </Space>
            </div>

            <Table
                columns={columns}
                dataSource={logs}
                rowKey={(record) => `${record.timestamp}-${record.device_name}-${record.point_name}`}
                loading={loading}
                pagination={false}
                size="middle"
                scroll={{ y: 600 }}
            />

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <Pagination
                    current={currentPage}
                    total={total}
                    pageSize={pageSize}
                    onChange={(page, size) => {
                        setCurrentPage(page);
                        setPageSize(size);
                    }}
                    showSizeChanger
                    showTotal={(total) => `Total ${total} entries`}
                />
            </div>
        </Card>
    );
};

export default HistoryLogsPanel;
