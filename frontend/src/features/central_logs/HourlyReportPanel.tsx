
import React, { useState, useEffect } from 'react';
import { Table, DatePicker, Button, Card, Space, message, Tag } from 'antd';
import { SearchOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import * as XLSX from 'xlsx-js-style'; // Using installed library

const { RangePicker } = DatePicker;

interface ReportRow {
    no: string;
    activate_date: string;
    mark: string;
    unit: string | null;
    value: number;
    floor: string | null;
    zone: string | null;
    room: string | null;
    panel: string | null;
    cb: string | null;
    type_cabinet: string | null;
}

const HourlyReportPanel: React.FC = () => {
    const [data, setData] = useState<ReportRow[]>([]);
    const [loading, setLoading] = useState(false);

    // Default range: Today
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().startOf('day'),
        dayjs().endOf('day')
    ]);

    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        if (!dateRange) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('bms_token');
            const response = await axios.get('http://localhost:3000/api/history-logs/report/hourly', {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    startDate: dateRange[0].toISOString(),
                    endDate: dateRange[1].toISOString()
                }
            });
            setData(response.data);
            message.success(`Loaded ${response.data.length} records`);
        } catch (error) {
            console.error('Failed to fetch report', error);
            message.error('Failed to load report data');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!data.length) return message.warning('No data to export');

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Hourly Report");
        XLSX.writeFile(wb, `Hourly_Report_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`);
    };

    const columns: any[] = [
        {
            title: 'No',
            dataIndex: 'no',
            key: 'no',
            width: 60,
        },
        {
            title: 'Date',
            dataIndex: 'activate_date',
            key: 'activate_date',
            width: 120,
        },
        {
            title: 'Point Mark',
            dataIndex: 'mark',
            key: 'mark',
            width: 150,
        },
        {
            title: 'Context',
            children: [
                { title: 'Floor', dataIndex: 'floor', key: 'floor', width: 100 },
                { title: 'Zone', dataIndex: 'zone', key: 'zone', width: 100 },
                { title: 'Room', dataIndex: 'room', key: 'room', width: 100 },
                { title: 'Panel', dataIndex: 'panel', key: 'panel', width: 100 },
            ]
        },
        {
            title: 'Value',
            dataIndex: 'value',
            key: 'value',
            render: (val: number) => <Tag color="blue">{Number(val).toFixed(2)}</Tag>,
            width: 100,
        },
        {
            title: 'Unit',
            dataIndex: 'unit',
            key: 'unit',
            width: 80,
        }
    ];

    return (
        <Card title="Hourly Report (For Report Tools)" bordered={false}>
            <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
                <RangePicker
                    showTime
                    value={dateRange}
                    onChange={(dates) => dates && setDateRange(dates as any)}
                    style={{ width: 300 }}
                />
                <Button type="primary" icon={<SearchOutlined />} onClick={fetchReport} loading={loading}>
                    Generate
                </Button>
                <Button icon={<UploadOutlined />} onClick={handleExport} disabled={!data.length}>
                    Export Excel
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={data}
                rowKey="no"
                loading={loading}
                scroll={{ x: 1200, y: 600 }}
                pagination={{ pageSize: 50 }}
                size="small"
                bordered
            />
        </Card>
    );
};

// Fix Icon import manually as I used UploadOutlined for export by mistake, usually use DownloadOutlined
import { UploadOutlined } from '@ant-design/icons';

export default HourlyReportPanel;
