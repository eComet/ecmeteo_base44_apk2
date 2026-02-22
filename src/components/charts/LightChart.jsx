import React from 'react';
import {
    ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { format, parseISO } from 'date-fns';

const THRESHOLD_LOW = 2000;
const THRESHOLD_MID = 10000;
const THRESHOLD_HIGH = 100000;

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
            <p className="text-gray-500 mb-2 font-medium">
                {format(parseISO(label.replace(' ', 'T')), 'dd.MM.yyyy HH:mm')}
            </p>
            {payload.filter(p => p.name === 'ambl' && p.value != null).map((p, i) => (
                <p key={i} style={{ color: p.color }} className="font-semibold">
                    Svietivosť: {typeof p.value === 'number' ? p.value.toFixed(0) : p.value} lux
                </p>
            ))}
        </div>
    );
};

export default function LightChart({ timestamps, series }) {
    if (!timestamps?.length || !series) return null;

    const amblSeries = series[0];
    const data = timestamps.map((ts, i) => {
        const v = amblSeries?.data[i] ?? 0;
        return {
            ts,
            ambl: v,
            low:  Math.min(v, THRESHOLD_LOW),
            mid:  Math.min(v, THRESHOLD_MID),
            high: Math.min(v, THRESHOLD_HIGH),
            top:  v,
        };
    });

    const maxVal = Math.max(...data.map(d => d.ambl));

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Graf Svietivosť</h2>
            <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
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
                        domain={[0, maxVal + 2]}
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        axisLine={false}
                        tickLine={false}
                        width={55}
                        label={{ value: 'Lux', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 10 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                    {/* Stacked filled areas by threshold */}
                    <Area type="monotone" dataKey="low"  fill="#93c5fd" stroke="none" fillOpacity={0.5} legendType="none" isAnimationActive={false} />
                    <Area type="monotone" dataKey="mid"  fill="#fde68a" stroke="none" fillOpacity={0.4} legendType="none" isAnimationActive={false} />
                    <Area type="monotone" dataKey="high" fill="#fb923c" stroke="none" fillOpacity={0.4} legendType="none" isAnimationActive={false} />
                    <Area type="monotone" dataKey="top"  fill="#f87171" stroke="none" fillOpacity={0.3} name="Top" isAnimationActive={false} />
                    <Line type="monotone" dataKey="ambl" stroke="#ff7f0e" strokeWidth={2} dot={false} isAnimationActive={false} name="ambl" />
                    <ReferenceLine y={THRESHOLD_LOW}  stroke="#fde047" strokeDasharray="5 3" strokeWidth={1.5} />
                    <ReferenceLine y={THRESHOLD_MID}  stroke="#f97316" strokeDasharray="5 3" strokeWidth={1.5} />
                    <ReferenceLine y={THRESHOLD_HIGH} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1.5} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}