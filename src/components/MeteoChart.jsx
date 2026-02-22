import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
                <p className="text-gray-500 mb-2 font-medium">
                    {format(parseISO(label.replace(' ', 'T')), 'dd.MM.yyyy HH:mm')}
                </p>
                {payload.map((p, i) => (
                    p.value !== null && p.value !== undefined && (
                        <p key={i} style={{ color: p.color }} className="font-semibold">
                            {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value} {p.unit || ''}
                        </p>
                    )
                ))}
            </div>
        );
    }
    return null;
};

export default function MeteoChart({ chart, timestamps }) {
    if (!chart || !timestamps) return null;

    const data = timestamps.map((ts, i) => {
        const point = { ts };
        chart.series.forEach(s => {
            point[s.name] = s.data[i] ?? null;
        });
        return point;
    });

    const xTickFormatter = (ts) => {
        try { return format(parseISO(ts.replace(' ', 'T')), 'HH:mm'); } catch { return ts; }
    };

    // Reference lines from series with is_reference=true or from chart.reference_lines
    const referenceLines = chart.reference_lines || [];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">{chart.title}</h2>
            <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        dataKey="ts"
                        tickFormatter={xTickFormatter}
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        tickCount={8}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        axisLine={false}
                        tickLine={false}
                        width={60}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                    {referenceLines.map((rl, i) => (
                        <ReferenceLine key={i} y={rl.value} stroke={rl.color} strokeDasharray="4 4"
                            label={{ value: rl.label, fill: rl.color, fontSize: 11, position: 'insideTopLeft' }} />
                    ))}
                    {chart.series.map((s) => (
                        <Line
                            key={s.name}
                            type="monotone"
                            dataKey={s.name}
                            stroke={s.color}
                            strokeWidth={s.is_reference ? 1.5 : 2}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                            isAnimationActive={false}
                            unit={s.unit ? ` ${s.unit}` : ''}
                            strokeDasharray={s.is_reference ? '6 3' : undefined}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}