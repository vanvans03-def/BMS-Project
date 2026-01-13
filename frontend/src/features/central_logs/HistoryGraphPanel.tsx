import React, { useState, useEffect } from 'react';
import { Card, DatePicker, Select, Button, Space, message, theme, Empty, Spin } from 'antd';
import { SearchOutlined, ReloadOutlined, ZoomOutOutlined, DownloadOutlined } from '@ant-design/icons';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceArea
} from 'recharts';
import dayjs from 'dayjs';
import axios from 'axios';
import * as XLSX from 'xlsx-js-style';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface HistoryTable {
    table_name: string;
    device_name: string;
    point_name: string;
}

interface GraphDataPoint {
    timestamp: string;
    originalTimestamp: number;
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

    // Zoom state
    const [left, setLeft] = useState<string | number>('dataMin');
    const [right, setRight] = useState<string | number>('dataMax');
    const [refAreaLeft, setRefAreaLeft] = useState<string | number>('');
    const [refAreaRight, setRefAreaRight] = useState<string | number>('');

    const { token } = theme.useToken();

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        try {
            const token = localStorage.getItem('bms_token');
            const response = await axios.get('http://localhost:3000/api/history-logs/tables', {
                headers: { Authorization: `Bearer ${token} ` }
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
        // Reset zoom when fetching new data
        setLeft('dataMin');
        setRight('dataMax');

        try {
            const token = localStorage.getItem('bms_token');
            const response = await axios.post('http://localhost:3000/api/history-logs/query', {
                tables: selectedTables,
                startDate: dateRange[0].toISOString(),
                endDate: dateRange[1].toISOString()
            }, {
                headers: { Authorization: `Bearer ${token} ` }
            });

            const rawResults = response.data;
            const mergedData: Record<string, any> = {};

            rawResults.forEach((result: any) => {
                const tableName = result.tableName;
                result.data.forEach((point: any) => {
                    const timeKey = dayjs(point.timestamp).format('YYYY-MM-DD HH:mm:ss');
                    // We use the timestamp string as key for merging, but we'll need originalTimestamp for sorting and axis
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
        return table ? `${table.device_name} - ${table.point_name} ` : tableName;
    };

    // Zoom handlers
    const zoom = () => {
        if (refAreaLeft === refAreaRight || refAreaRight === '') {
            setRefAreaLeft('');
            setRefAreaRight('');
            return;
        }

        // Ensure left is smaller than right
        let nextLeft = refAreaLeft;
        let nextRight = refAreaRight;

        if (nextLeft > nextRight) {
            [nextLeft, nextRight] = [nextRight, nextLeft];
        }

        setRefAreaLeft('');
        setRefAreaRight('');
        setLeft(nextLeft);
        setRight(nextRight);
    };

    const zoomOut = () => {
        setLeft('dataMin');
        setRight('dataMax');
    };

    const formatXAxis = (tickItem: number) => {
        return dayjs(tickItem).format('MM-DD HH:mm');
    };

    const handleExport = () => {
        if (data.length === 0) {
            message.warning('No data to export');
            return;
        }

        try {
            const exportData = data.map(item => {
                const row: any = { Timestamp: item.timestamp };
                selectedTables.forEach(tableName => {
                    const label = getPointLabel(tableName);
                    row[label] = item[tableName] !== undefined ? item[tableName] : '';
                });
                return row;
            });

            const ws = XLSX.utils.json_to_sheet(exportData);

            // Adjust column widths
            const wscols = Object.keys(exportData[0] || {}).map(key => ({
                wch: Math.max(key.length, 20)
            }));
            ws['!cols'] = wscols;

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "History Data");
            XLSX.writeFile(wb, `history_export_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
            message.success('Export successful');
        } catch (error) {
            console.error('Export failed', error);
            message.error('Failed to export data');
        }
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
                        <Button
                            icon={<ZoomOutOutlined />}
                            onClick={zoomOut}
                            disabled={data.length === 0 || (left === 'dataMin' && right === 'dataMax')}
                        >
                            Zoom Out
                        </Button>
                        <Button
                            icon={<DownloadOutlined />}
                            onClick={handleExport}
                            disabled={data.length === 0}
                        >
                            Export Excel
                        </Button>
                    </Space>
                </Space>
            </div>

            <div
                style={{ height: 600, width: '100%', userSelect: 'none' }}
                className="graph-container"
            >
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
                            onMouseDown={(e) => e && setRefAreaLeft(e.activeLabel as any)}
                            onMouseMove={(e) => refAreaLeft && e && setRefAreaRight(e.activeLabel as any)}
                            onMouseUp={zoom}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="originalTimestamp"
                                tickFormatter={formatXAxis}
                                allowDataOverflow
                                domain={[left, right]}
                                type="number"
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis />
                            <Tooltip
                                labelFormatter={(label) => dayjs(label).format('YYYY-MM-DD HH:mm:ss')}
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
                                    isAnimationActive={false} // Disable animation for better performance during zoom
                                />
                            ))}
                            {refAreaLeft && refAreaRight ? (
                                <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} />
                            ) : null}
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
