import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { format, parseISO } from 'date-fns';

const THRESHOLD_LOW = 20;
const THRESHOLD_MID = 40;
const THRESHOLD_HIGH = 100;

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
            <p className="text-gray-500 mb-2 font-medium">
                {format(parseISO(label.replace(' ', 'T')), 'dd.MM.yyyy HH:mm')}
            </p>
            {payload.map((p, i) => p.value != null && (
                <p key={i} style={{ color: p.color }} className="font-semibold">
                    {p.name}: {typeof p.value === 'number' ? p.value.toFixed(0) : p.value} μg/m³
                </p>
            ))}
        </div>
    );
};

export default function PmChart({ timestamps, series }) {
    if (!timestamps?.length || !series) return null;

    const [pm1_0, pm2_5, pm10] = series;

    const data = timestamps.map((ts, i) => ({
        ts,
        'pm1.0': pm1_0?.data[i] ?? null,
        'pm2.5': pm2_5?.data[i] ?? null,
        'pm10':  pm10?.data[i] ?? null,
    }));

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Graf PM častice</h2>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        dataKey="ts"
                        tickFormatter={ts => { try { return format(parseISO(ts.replace(' ', 'T')), 'HH:mm'); } catch { return ts; } }}
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        tickCount={8}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        domain={[0, THRESHOLD_HIGH + 10]}
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        axisLine={false}
                        tickLine={false}
                        width={45}
                        label={{ value: 'μg/m³', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 10 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                    <ReferenceLine y={THRESHOLD_LOW} stroke="#3b82f6" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: '20', fill: '#3b82f6', fontSize: 10, position: 'right' }} />
                    <ReferenceLine y={THRESHOLD_MID} stroke="#f97316" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: '40', fill: '#f97316', fontSize: 10, position: 'right' }} />
                    <ReferenceLine y={THRESHOLD_HIGH} stroke="#a855f7" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: '100', fill: '#a855f7', fontSize: 10, position: 'right' }} />
                    <Line type="monotone" dataKey="pm1.0" stroke="#1f77b4" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="pm2.5" stroke="#ff7f0e" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="pm10"  stroke="#2ca02c" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}