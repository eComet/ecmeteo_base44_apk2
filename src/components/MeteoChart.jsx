import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { format } from 'date-fns';

const CustomTooltip = ({ active, payload, label, unit }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                <p className="text-xs text-gray-500 mb-1">{format(new Date(label * 1000), 'dd.MM.yyyy HH:mm')}</p>
                <p className="font-semibold" style={{ color: payload[0].color }}>
                    {payload[0].value !== null && payload[0].value !== undefined
                        ? `${payload[0].value.toFixed(2)} ${unit}`
                        : 'N/A'}
                </p>
            </div>
        );
    }
    return null;
};

const SingleSeriesChart = ({ series, timestamps, syncId, isLast }) => {
    const data = timestamps.map((ts, i) => ({
        ts,
        value: series.data[i]
    }));

    const values = series.data.filter(v => v !== null && v !== undefined);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const padding = (maxVal - minVal) * 0.1 || 1;

    const xTickFormatter = (ts) => format(new Date(ts * 1000), 'HH:mm');
    const xTickCount = 6;

    return (
        <div className={`${!isLast ? 'mb-1' : ''}`}>
            <div className="flex items-center gap-2 mb-1 px-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: series.color }} />
                <span className="text-sm font-medium text-gray-700">{series.name}</span>
                <span className="text-xs text-gray-400">({series.unit})</span>
            </div>
            <ResponsiveContainer width="100%" height={140}>
                <LineChart data={data} syncId={syncId} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        dataKey="ts"
                        tickFormatter={xTickFormatter}
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        tickCount={xTickCount}
                        hide={!isLast}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        domain={[minVal - padding, maxVal + padding]}
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        tickFormatter={(v) => v.toFixed(1)}
                        axisLine={false}
                        tickLine={false}
                        width={55}
                        unit={` ${series.unit}`}
                    />
                    <Tooltip content={<CustomTooltip unit={series.unit} />} />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={series.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default function MeteoChart({ chart, timestamps }) {
    if (!chart || !timestamps) return null;

    const syncId = `chart-${chart.id}`;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">{chart.title}</h2>
            <div>
                {chart.series.map((series, idx) => (
                    <SingleSeriesChart
                        key={series.name}
                        series={series}
                        timestamps={timestamps}
                        syncId={syncId}
                        isLast={idx === chart.series.length - 1}
                    />
                ))}
            </div>
        </div>
    );
}