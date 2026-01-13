import React, { useState, useEffect } from 'react';
import { Card, DatePicker, Select, Button, Space, message, theme, Empty, Spin } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import dayjs from 'dayjs';
import axios from 'axios';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface HistoryTable {
    table_name: string;
    device_name: string;
    point_name: string;
}

interface GraphDataPoint {
    timestamp: string;
    [key: string]: number | string;
}

const COLORS = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c',
    '#d0ed57', '#8dd1e1', '#83a6ed', '#8e44ad', '#e74c3c'
];

const HistoryGraphPanel: React.FC = () => {
    const [tables, setTables] = useState<HistoryTable[]>([]);
    const [selectedTables, setSelectedTables] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
        dayjs().subtract(24, 'hour'),
        dayjs()
    ]);
    const [data, setData] = useState<GraphDataPoint[]>([]);
    const [loading, setLoading] = useState(false);
    const { token } = theme.useToken();

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        try {
            const token = localStorage.getItem('bms_token');
            const response = await axios.get('http://localhost:3000/api/history-logs/tables', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTables(response.data || []);
        } catch (error) {
            console.error('Failed to fetch history tables', error);
            message.error('Failed to load points configuration');
        }
    };

    const fetchData = async () => {
        if (selectedTables.length === 0 || !dateRange) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('bms_token');
            const response = await axios.post('http://localhost:3000/api/history-logs/query', {
                tables: selectedTables,
                startDate: dateRange[0].toISOString(),
                endDate: dateRange[1].toISOString()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Process data for Recharts
            // Response format: [{ tableName, data: [{ timestamp, value }] }]
            // We need to merge them by timestamp

            const rawResults = response.data;
            const mergedData: Record<string, any> = {};

            rawResults.forEach((result: any) => {
                const tableName = result.tableName;
                result.data.forEach((point: any) => {
                    // Round timestamp to nearest second or minute to align data points? 
                    // For now, let's just use the timestamp string. 
                    // To align points from different devices that might log at slightly different milliseconds,
                    // we might need some bucketing. But let's try raw first or maybe align to nearest minute.
                    // For better graph comparison, let's try to keep resolution but formatted.

                    const timeKey = dayjs(point.timestamp).format('YYYY-MM-DD HH:mm:ss');

                    if (!mergedData[timeKey]) {
                        mergedData[timeKey] = {
                            timestamp: timeKey,
                            originalTimestamp: new Date(point.timestamp).getTime()
                        };
                    }
                    mergedData[timeKey][tableName] = point.value;
                });
            });

            const finalData = Object.values(mergedData).sort((a: any, b: any) =>
                a.originalTimestamp - b.originalTimestamp
            );

            setData(finalData);
            if (finalData.length === 0) {
                message.info('No data found for the selected range');
            }

        } catch (error) {
            console.error('Failed to fetch history data', error);
            message.error('Failed to load graph data');
        } finally {
            setLoading(false);
        }
    };

    const getPointLabel = (tableName: string) => {
        const table = tables.find(t => t.table_name === tableName);
        return table ? `${table.device_name} - ${table.point_name}` : tableName;
    };

    return (
        <Card title="History Graph" variant="borderless" styles={{ body: { padding: '0 24px 24px' } }}>
            <div style={{ marginBottom: 24 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Space size="large" style={{ flexWrap: 'wrap' }}>
                        <Select
                            mode="multiple"
                            placeholder="Select Data Points to Compare"
                            style={{ minWidth: 400, maxWidth: 800 }}
                            allowClear
                            value={selectedTables}
                            onChange={setSelectedTables}
                            maxTagCount="responsive"
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {tables.map(t => (
                                <Option key={t.table_name} value={t.table_name}>
                                    {t.device_name} - {t.point_name}
                                </Option>
                            ))}
                        </Select>

                        <RangePicker
                            showTime
                            value={dateRange}
                            onChange={(dates) => setDateRange(dates as any)}
                        />

                        <Button
                            type="primary"
                            icon={<SearchOutlined />}
                            onClick={fetchData}
                            disabled={selectedTables.length === 0 || !dateRange}
                            loading={loading}
                        >
                            Plot Graph
                        </Button>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={fetchData}
                            disabled={selectedTables.length === 0 || !dateRange}
                        >
                            Refresh
                        </Button>
                    </Space>
                </Space>
            </div>

            <div style={{ height: 600, width: '100%' }}>
                {loading ? (
                    <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Spin size="large" />
                    </div>
                ) : data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{
                                top: 5,
                                right: 30,
                                left: 20,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="timestamp"
                                tick={{ fontSize: 12 }}
                                minTickGap={30}
                            />
                            <YAxis />
                            <Tooltip
                                contentStyle={{ backgroundColor: token.colorBgElevated, borderColor: token.colorBorder }}
                                labelStyle={{ color: token.colorText }}
                            />
                            <Legend />
                            {selectedTables.map((tableName, index) => (
                                <Line
                                    key={tableName}
                                    type="monotone"
                                    dataKey={tableName}
                                    name={getPointLabel(tableName)}
                                    stroke={COLORS[index % COLORS.length]}
                                    activeDot={{ r: 8 }}
                                    dot={false}
                                    strokeWidth={2}
                                    connectNulls
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Empty description="No data to display. Select points and click Plot Graph." />
                    </div>
                )}
            </div>
        </Card>
    );
};

export default HistoryGraphPanel;
