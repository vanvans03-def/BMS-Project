import React, { useState, useEffect } from 'react';
import { Card, DatePicker, Select, TreeSelect, Button, Space, message, theme, Empty, Spin, Tooltip as AntTooltip, Tag } from 'antd';
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
// const { Option } = Select; // Unused

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

interface HistoryGraphPanelProps {
    initialSelection?: { deviceName: string, pointName: string }[]
    contextDeviceId?: number // If provided, filter dropdown to this device only? Or just pre-select
    className?: string
    style?: React.CSSProperties
}

const HistoryGraphPanel: React.FC<HistoryGraphPanelProps> = ({ initialSelection, className, style }) => {
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

    // Effect to handle initial selection once tables are loaded
    useEffect(() => {
        if (tables.length > 0 && initialSelection && initialSelection.length > 0) {
            const preSelected: string[] = []
            initialSelection.forEach(sel => {
                // Find table matching device and point
                // Note: device_name in DB might differ slightly from UI if sanitized usually, 
                // but here we compare with what the API returns which is from DB table metadata or inferred.
                // The API /tables returns list of available tables.
                const match = tables.find(t =>
                    t.device_name === sel.deviceName &&
                    t.point_name === sel.pointName
                )
                if (match) preSelected.push(match.table_name)
            })
            if (preSelected.length > 0) {
                setSelectedTables(prev => {
                    // Merge with existing or replace? Replace for "Pre-select" context usually.
                    // If user is just opening the modal, replace.
                    return Array.from(new Set([...prev, ...preSelected]))
                })
            }
        }
    }, [tables, initialSelection])

    const fetchTables = async () => {
        try {
            // Using authFetch instead of axios directly if possible, but keeping axios for now matching file style
            // Actually, best to use authFetch or handle token from context, but let's stick to existing pattern
            const token = localStorage.getItem('bms_token');
            const response = await axios.get('http://localhost:3000/api/history-logs/tables', {
                headers: { Authorization: `Bearer ${token} ` }
            });
            let data = response.data || []

            // Filter by context if needed (optional)
            // if (contextDeviceId) { ... } 

            setTables(data);
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
        <Card title="History Graph" variant="borderless" styles={{ body: { padding: '0 24px 24px' } }} className={className} style={style}>
            <div style={{ marginBottom: 24 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Space size="large" style={{ flexWrap: 'wrap' }}>
                        <TreeSelect
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
                                children: points.map(p => ({
                                    title: p.point_name,
                                    value: p.table_name,
                                    key: p.table_name,
                                }))
                            }))}
                            value={selectedTables}
                            onChange={(newValue) => {
                                // Filter out device nodes if they somehow get into the selection (though SHOW_CHILD should prevent this for leaf-only strategy)
                                // Actually SHOW_CHILD triggers check on leaves. 
                                // Antd TreeSelect:
                                // If treeCheckable=true and showCheckedStrategy=SHOW_CHILD, onChange returns leaf keys.
                                setSelectedTables(newValue as string[])
                            }}
                            treeCheckable
                            showCheckedStrategy={TreeSelect.SHOW_CHILD}
                            placeholder="Select points..."
                            style={{ width: 400 }}
                            maxTagCount="responsive"
                            maxTagPlaceholder={(omittedValues) => (
                                <AntTooltip overlayStyle={{ pointerEvents: 'none' }} title={omittedValues.map((v) => <div key={v.value}>{v.label}</div>)}>
                                    <Tag>+ {omittedValues.length} ...</Tag>
                                </AntTooltip>
                            )}
                            treeDefaultExpandAll
                            allowClear
                        />

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
