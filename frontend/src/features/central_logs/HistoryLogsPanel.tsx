import React, { useState, useEffect } from 'react';
import { Table, DatePicker, Select, TreeSelect, Button, Tag, Pagination, Card, Space, message, Descriptions } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';

const { RangePicker } = DatePicker;
// const { Option } = Select; // Unused

interface HistoryLog {
    timestamp: string;
    value: number;
    quality_code: string;
}

interface HistoryTable {
    table_name: string;
    device_name: string;
    point_name: string;
}

const HistoryLogsPanel: React.FC = () => {
    const [logs, setLogs] = useState<HistoryLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Filters,
    const [tables, setTables] = useState<HistoryTable[]>([]);
    const [selectedTableName, setSelectedTableName] = useState<string | undefined>(undefined);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

    useEffect(() => {
        fetchTables();
    }, []);

    useEffect(() => {
        if (selectedTableName) {
            fetchLogs();
        } else {
            setLogs([]);
            setTotal(0);
        }
    }, [currentPage, pageSize, selectedTableName]); // Auto-fetch when these change

    const fetchTables = async () => {
        try {
            const token = localStorage.getItem('bms_token');
            const response = await axios.get('http://localhost:3000/api/history-logs/tables', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = Array.isArray(response.data) ? response.data : [];
            setTables(data);
            if (data.length > 0) {
                // Optional: Auto-select first table? 
                // setSelectedTableName(data[0].table_name);
            }
        } catch (error) {
            console.error('Failed to fetch history tables', error);
            message.error('Failed to load history configuration');
        }
    };

    const fetchLogs = async () => {
        if (!selectedTableName) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('bms_token');
            const params: any = {
                page: currentPage,
                limit: pageSize,
            };

            if (dateRange) {
                params.startDate = dateRange[0].toISOString();
                params.endDate = dateRange[1].toISOString();
            }

            const response = await axios.get(`http://localhost:3000/api/history-logs/table/${selectedTableName}`, {
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
            width: 200,
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
                    {status ? status.toUpperCase() : 'UNKNOWN'}
                </Tag>
            )
        }
    ];

    const selectedTableInfo = tables.find(t => t.table_name === selectedTableName);

    return (
        <Card title="History Logs" variant="borderless" styles={{ body: { padding: '0 24px 24px' } }}>
            <div style={{ marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Space direction="vertical" style={{ width: '100%' }}>

                    <Space size="large" style={{ marginBottom: 10 }}>
                        <TreeSelect
                            showSearch
                            style={{ width: 400 }}
                            value={selectedTableName}
                            dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                            placeholder="Select Data Point"
                            allowClear
                            treeDefaultExpandAll
                            onChange={(val) => {
                                setSelectedTableName(val);
                                setCurrentPage(1);
                            }}
                            treeData={Object.entries(
                                tables.reduce((acc, t) => {
                                    if (!acc[t.device_name]) acc[t.device_name] = [];
                                    acc[t.device_name].push(t);
                                    return acc;
                                }, {} as Record<string, typeof tables>)
                            ).map(([device, points]) => ({
                                title: device,
                                value: `__DEVICE__${device}`,
                                key: `__DEVICE__${device}`,
                                selectable: false, // User must select a point, not a device folder
                                children: points.map(p => ({
                                    title: p.point_name,
                                    value: p.table_name,
                                    key: p.table_name,
                                }))
                            }))}
                        />

                        <RangePicker
                            showTime
                            onChange={(dates) => setDateRange(dates as any)}
                            style={{ width: 350 }}
                        />

                        <Button
                            type="primary"
                            icon={<SearchOutlined />}
                            onClick={() => { setCurrentPage(1); fetchLogs(); }}
                            disabled={!selectedTableName}
                        >
                            Search
                        </Button>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={fetchLogs}
                            disabled={!selectedTableName}
                        >
                            Refresh
                        </Button>
                    </Space>

                    {selectedTableInfo && (
                        <Descriptions size="small" bordered column={2}>
                            <Descriptions.Item label="Device">{selectedTableInfo.device_name}</Descriptions.Item>
                            <Descriptions.Item label="Point">{selectedTableInfo.point_name}</Descriptions.Item>
                            <Descriptions.Item label="Table Name">{selectedTableInfo.table_name}</Descriptions.Item>
                        </Descriptions>
                    )}
                </Space>
            </div>

            <Table
                columns={columns}
                dataSource={logs}
                rowKey="timestamp"
                loading={loading}
                pagination={false}
                size="middle"
                scroll={{ y: 600 }}
                locale={{ emptyText: selectedTableName ? 'No data' : 'Please select a data point' }}
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
