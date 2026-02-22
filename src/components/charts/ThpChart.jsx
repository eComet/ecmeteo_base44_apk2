import React from 'react';
import {
    ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
            <p className="text-gray-500 mb-2 font-medium">
                {format(parseISO(label.replace(' ', 'T')), 'dd.MM.yyyy HH:mm')}
            </p>
            {payload.map((p, i) => p.value != null && (
                <p key={i} style={{ color: p.color }} className="font-semibold">
                    {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
                    {p.name === 'Teplota' ? ' °C' : p.name === 'Vlhkosť' ? ' %' : ' hPa'}
                </p>
            ))}
        </div>
    );
};

export default function ThpChart({ timestamps, series }) {
    if (!timestamps?.length || !series) return null;

    const [teplota, vlhkost, tlak] = series;

    const data = timestamps.map((ts, i) => ({
        ts,
        Teplota: teplota?.data[i] ?? null,
        Vlhkosť: vlhkost?.data[i] ?? null,
        Tlak: tlak?.data[i] ?? null,
    }));

    const tepMin = Math.min(...data.map(d => d.Teplota).filter(v => v != null));
    const tepMax = Math.max(...data.map(d => d.Teplota).filter(v => v != null));
    const vlhMin = Math.min(...data.map(d => d.Vlhkosť).filter(v => v != null));
    const tlakMin = Math.min(...data.map(d => d.Tlak).filter(v => v != null));
    const tlakMax = Math.max(...data.map(d => d.Tlak).filter(v => v != null));

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Graf Teplota / Vlhkosť / Tlak</h2>
            <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data} margin={{ top: 8, right: 60, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        dataKey="ts"
                        tickFormatter={ts => { try { return format(parseISO(ts.replace(' ', 'T')), 'HH:mm'); } catch { return ts; } }}
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        tickCount={8}
                        axisLine={false}
                        tickLine={false}
                    />
                    {/* Left axis: Teplota */}
                    <YAxis
                        yAxisId="teplota"
                        domain={[tepMin - 2, tepMax + 2]}
                        tick={{ fontSize: 11, fill: '#1f77b4' }}
                        axisLine={false}
                        tickLine={false}
                        width={45}
                        label={{ value: '°C', angle: -90, position: 'insideLeft', fill: '#1f77b4', fontSize: 11 }}
                    />
                    {/* Left axis 2: Vlhkosť */}
                    <YAxis
                        yAxisId="vlhkost"
                        orientation="left"
                        domain={[vlhMin - 2, 105]}
                        tick={{ fontSize: 11, fill: '#ff7f0e' }}
                        axisLine={false}
                        tickLine={false}
                        width={45}
                        label={{ value: '%', angle: -90, position: 'insideLeft', fill: '#ff7f0e', fontSize: 11 }}
                    />
                    {/* Right axis: Tlak */}
                    <YAxis
                        yAxisId="tlak"
                        orientation="right"
                        domain={[tlakMin - 2, tlakMax + 2]}
                        tick={{ fontSize: 11, fill: '#2ca02c' }}
                        axisLine={false}
                        tickLine={false}
                        width={55}
                        label={{ value: 'hPa', angle: 90, position: 'insideRight', fill: '#2ca02c', fontSize: 11 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                    <Line yAxisId="teplota" type="monotone" dataKey="Teplota" stroke="#1f77b4" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line yAxisId="vlhkost" type="monotone" dataKey="Vlhkosť" stroke="#ff7f0e" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line yAxisId="tlak" type="monotone" dataKey="Tlak" stroke="#2ca02c" strokeWidth={2} dot={false} isAnimationActive={false} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}