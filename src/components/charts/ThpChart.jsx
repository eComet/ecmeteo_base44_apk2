import React from 'react';
import {
    ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import { format } from 'date-fns';

// Parse timestamp - supports both ISO string and milliseconds number
function parseTs(ts) {
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'string') {
        // "YYYY-MM-DD HH:MM:SS" or ISO
        return new Date(ts.replace(' ', 'T')).getTime();
    }
    return null;
}

function fmtTime(ts) {
    const ms = parseTs(ts);
    if (!ms) return ts;
    return format(new Date(ms), 'HH:mm');
}

function fmtTooltipTime(ts) {
    const ms = parseTs(ts);
    if (!ms) return ts;
    return format(new Date(ms), 'dd.MM.yyyy HH:mm');
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
            <p className="text-gray-500 mb-2 font-medium">{fmtTooltipTime(label)}</p>
            {payload.map((p, i) => p.value != null && (
                <p key={i} style={{ color: p.color }} className="font-semibold">
                    {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
                    {p.name === 'Teplota' ? ' °C' : p.name === 'Vlhkosť' ? ' %' : ' hPa'}
                </p>
            ))}
        </div>
    );
};

export default function ThpChart({ timestamps, series }) {
    if (!timestamps?.length || !series?.length) return null;

    const tepSeries  = series.find(s => s.name?.toLowerCase().includes('tep') || s.id === 'teplota')   || series[0];
    const vlhSeries  = series.find(s => s.name?.toLowerCase().includes('vlh') || s.id === 'vlhkost')   || series[1];
    const tlakSeries = series.find(s => s.name?.toLowerCase().includes('tlak') || s.id === 'tlak')     || series[2];

    const tepData  = tepSeries?.data  ?? [];
    const vlhData  = vlhSeries?.data  ?? [];
    const tlakData = tlakSeries?.data ?? [];

    const data = timestamps.map((ts, i) => ({
        ts,
        Teplota:  tepData[i]  ?? null,
        Vlhkosť:  vlhData[i]  ?? null,
        Tlak:     tlakData[i] ?? null,
    }));

    const nonNullTep  = tepData.filter(v => v != null);
    const nonNullVlh  = vlhData.filter(v => v != null);
    const nonNullTlak = tlakData.filter(v => v != null);

    const tepMin  = nonNullTep.length  ? Math.min(...nonNullTep)  - 1  : -5;
    const tepMax  = nonNullTep.length  ? Math.max(...nonNullTep)  + 1  : 40;
    const vlhMin  = nonNullVlh.length  ? Math.min(...nonNullVlh)  - 2  : 0;
    const vlhMax  = nonNullVlh.length  ? Math.max(...nonNullVlh)  + 2  : 105;
    const tlakMin = nonNullTlak.length ? Math.min(...nonNullTlak) - 1  : 990;
    const tlakMax = nonNullTlak.length ? Math.max(...nonNullTlak) + 1  : 1030;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 col-span-1 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Graf Teplota / Vlhkosť / Tlak</h2>
            <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={data} margin={{ top: 10, right: 80, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

                    <XAxis
                        dataKey="ts"
                        tickFormatter={fmtTime}
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickCount={10}
                        axisLine={{ stroke: '#d1d5db' }}
                        tickLine={false}
                        minTickGap={40}
                    />

                    {/* Left axis: Teplota (blue) */}
                    <YAxis
                        yAxisId="teplota"
                        orientation="left"
                        domain={[tepMin, tepMax]}
                        tick={{ fontSize: 11, fill: '#1f77b4' }}
                        axisLine={{ stroke: '#1f77b4' }}
                        tickLine={false}
                        width={55}
                        tickFormatter={v => `${v.toFixed(1)} °C`}
                    />

                    {/* Right axis: Vlhkosť (orange) */}
                    <YAxis
                        yAxisId="vlhkost"
                        orientation="right"
                        domain={[vlhMin, vlhMax]}
                        tick={{ fontSize: 11, fill: '#ff7f0e' }}
                        axisLine={{ stroke: '#ff7f0e' }}
                        tickLine={false}
                        width={60}
                        tickFormatter={v => `${v.toFixed(0)} %`}
                    />

                    {/* Right axis 2: Tlak (green) */}
                    <YAxis
                        yAxisId="tlak"
                        orientation="right"
                        domain={[tlakMin, tlakMax]}
                        tick={{ fontSize: 11, fill: '#2ca02c' }}
                        axisLine={{ stroke: '#2ca02c' }}
                        tickLine={false}
                        width={75}
                        tickFormatter={v => `${v.toFixed(1)} hPa`}
                    />

                    <Tooltip content={<CustomTooltip />} />

                    <Legend
                        wrapperStyle={{ fontSize: '12px', paddingTop: '14px' }}
                        formatter={(value) => <span style={{ color: '#374151' }}>{value}</span>}
                    />

                    <Line
                        yAxisId="teplota"
                        type="monotone"
                        dataKey="Teplota"
                        stroke="#1f77b4"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        isAnimationActive={false}
                        connectNulls
                    />
                    <Line
                        yAxisId="vlhkost"
                        type="monotone"
                        dataKey="Vlhkosť"
                        stroke="#ff7f0e"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        isAnimationActive={false}
                        connectNulls
                    />
                    <Line
                        yAxisId="tlak"
                        type="monotone"
                        dataKey="Tlak"
                        stroke="#2ca02c"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        isAnimationActive={false}
                        connectNulls
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}