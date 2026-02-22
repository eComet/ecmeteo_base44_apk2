import React, { useState, useRef, useCallback } from 'react';
import {
    ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, ReferenceArea
} from 'recharts';
import { format } from 'date-fns';
import ChartToolbar from './ChartToolbar';

function parseTs(ts) {
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'string') return new Date(ts.replace(' ', 'T')).getTime();
    return null;
}
function fmtTime(ts) {
    const ms = parseTs(ts);
    return ms ? format(new Date(ms), 'HH:mm') : String(ts);
}
function fmtTooltipTime(ts) {
    const ms = parseTs(ts);
    return ms ? format(new Date(ms), 'dd.MM.yyyy HH:mm') : String(ts);
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
    const [activeTool, setActiveTool] = useState('hover');
    const [showLegend, setShowLegend] = useState(true);
    const [hoverEnabled, setHoverEnabled] = useState(true);

    // Zoom state
    const [zoomArea, setZoomArea] = useState(null);   // { x1, x2 } during selection
    const [zoomRange, setZoomRange] = useState(null); // { start, end } applied
    const isSelecting = useRef(false);
    const chartRef = useRef(null);

    // Pan state
    const panStart = useRef(null);
    const panRangeAtStart = useRef(null);

    if (!timestamps?.length || !series?.length) return null;

    const tepSeries  = series.find(s => s.name?.toLowerCase().includes('tep'))  || series[0];
    const vlhSeries  = series.find(s => s.name?.toLowerCase().includes('vlh'))  || series[1];
    const tlakSeries = series.find(s => s.name?.toLowerCase().includes('tlak')) || series[2];

    const tepData  = tepSeries?.data  ?? [];
    const vlhData  = vlhSeries?.data  ?? [];
    const tlakData = tlakSeries?.data ?? [];

    const allData = timestamps.map((ts, i) => ({
        ts,
        Teplota:  tepData[i]  ?? null,
        Vlhkosť:  vlhData[i]  ?? null,
        Tlak:     tlakData[i] ?? null,
    }));

    // Apply zoom filter
    const data = zoomRange
        ? allData.filter(d => {
            const ms = parseTs(d.ts);
            return ms >= zoomRange.start && ms <= zoomRange.end;
          })
        : allData;

    const nonNullTep  = tepData.filter(v => v != null);
    const nonNullVlh  = vlhData.filter(v => v != null);
    const nonNullTlak = tlakData.filter(v => v != null);

    const tepMin  = nonNullTep.length  ? Math.min(...nonNullTep)  - 1  : -5;
    const tepMax  = nonNullTep.length  ? Math.max(...nonNullTep)  + 1  : 40;
    const vlhMin  = nonNullVlh.length  ? Math.min(...nonNullVlh)  - 2  : 0;
    const vlhMax  = nonNullVlh.length  ? Math.max(...nonNullVlh)  + 2  : 105;
    const tlakMin = nonNullTlak.length ? Math.min(...nonNullTlak) - 1  : 990;
    const tlakMax = nonNullTlak.length ? Math.max(...nonNullTlak) + 1  : 1030;

    // Save chart as PNG
    const handleSave = useCallback(() => {
        const svgEl = chartRef.current?.querySelector('svg');
        if (!svgEl) return;
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const canvas = document.createElement('canvas');
        const rect = svgEl.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const a = document.createElement('a');
            a.download = 'thp_chart.png';
            a.href = canvas.toDataURL('image/png');
            a.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }, []);

    const handleReset = useCallback(() => {
        setZoomRange(null);
        setZoomArea(null);
    }, []);

    // Box zoom handlers on chart container
    const handleMouseDown = (e) => {
        if (activeTool !== 'zoom' && activeTool !== 'pan') return;
        if (activeTool === 'zoom') {
            const chart = e.currentTarget.querySelector('.recharts-wrapper');
            if (!chart) return;
            const rect = chart.getBoundingClientRect();
            const xFrac = (e.clientX - rect.left) / rect.width;
            const visibleTs = data.map(d => parseTs(d.ts));
            const tsMin = Math.min(...visibleTs);
            const tsMax = Math.max(...visibleTs);
            const tsVal = tsMin + xFrac * (tsMax - tsMin);
            isSelecting.current = true;
            setZoomArea({ x1: tsVal, x2: tsVal });
        }
        if (activeTool === 'pan') {
            const visibleTs = data.map(d => parseTs(d.ts));
            panStart.current = e.clientX;
            panRangeAtStart.current = {
                start: zoomRange?.start ?? Math.min(...visibleTs),
                end:   zoomRange?.end   ?? Math.max(...visibleTs),
            };
        }
    };

    const handleMouseMove = (e) => {
        if (activeTool === 'zoom' && isSelecting.current && zoomArea) {
            const chart = e.currentTarget.querySelector('.recharts-wrapper');
            if (!chart) return;
            const rect = chart.getBoundingClientRect();
            const xFrac = (e.clientX - rect.left) / rect.width;
            const visibleTs = data.map(d => parseTs(d.ts));
            const tsMin = Math.min(...visibleTs);
            const tsMax = Math.max(...visibleTs);
            setZoomArea(prev => ({ ...prev, x2: tsMin + xFrac * (tsMax - tsMin) }));
        }
        if (activeTool === 'pan' && panStart.current !== null) {
            const chart = e.currentTarget.querySelector('.recharts-wrapper');
            if (!chart) return;
            const rect = chart.getBoundingClientRect();
            const dxFrac = (e.clientX - panStart.current) / rect.width;
            const { start, end } = panRangeAtStart.current;
            const span = end - start;
            const allTs = allData.map(d => parseTs(d.ts));
            const totalMin = Math.min(...allTs);
            const totalMax = Math.max(...allTs);
            let newStart = start - dxFrac * span;
            let newEnd   = end   - dxFrac * span;
            if (newStart < totalMin) { newStart = totalMin; newEnd = totalMin + span; }
            if (newEnd   > totalMax) { newEnd = totalMax;   newStart = totalMax - span; }
            setZoomRange({ start: newStart, end: newEnd });
        }
    };

    const handleMouseUp = (e) => {
        if (activeTool === 'zoom' && isSelecting.current && zoomArea) {
            isSelecting.current = false;
            const { x1, x2 } = zoomArea;
            if (Math.abs(x2 - x1) > 1000) {
                setZoomRange({ start: Math.min(x1, x2), end: Math.max(x1, x2) });
            }
            setZoomArea(null);
        }
        if (activeTool === 'pan') {
            panStart.current = null;
        }
    };

    const cursor = activeTool === 'pan' ? 'grab' : activeTool === 'zoom' ? 'crosshair' : 'default';

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 col-span-1 lg:col-span-2 relative">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Graf Teplota / Vlhkosť / Tlak</h2>

            <ChartToolbar
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                showLegend={showLegend}
                setShowLegend={setShowLegend}
                hoverEnabled={hoverEnabled}
                setHoverEnabled={setHoverEnabled}
                onReset={handleReset}
                onSave={handleSave}
            />

            <div
                ref={chartRef}
                style={{ cursor, userSelect: 'none' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
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

                        <Tooltip
                            content={hoverEnabled ? <CustomTooltip /> : null}
                            active={hoverEnabled ? undefined : false}
                        />

                        {showLegend && (
                            <Legend
                                verticalAlign="bottom"
                                align="left"
                                wrapperStyle={{ fontSize: '12px', paddingLeft: '60px', paddingBottom: '4px' }}
                                formatter={(value) => <span style={{ color: '#374151' }}>{value}</span>}
                            />
                        )}

                        {/* Zoom selection area */}
                        {zoomArea && (
                            <ReferenceArea
                                yAxisId="teplota"
                                x1={zoomArea.x1}
                                x2={zoomArea.x2}
                                strokeOpacity={0.3}
                                fill="#3b82f6"
                                fillOpacity={0.15}
                            />
                        )}

                        <Line yAxisId="teplota" type="monotone" dataKey="Teplota"
                            stroke="#1f77b4" strokeWidth={2} dot={false}
                            activeDot={hoverEnabled ? { r: 4 } : false}
                            isAnimationActive={false} connectNulls />
                        <Line yAxisId="vlhkost" type="monotone" dataKey="Vlhkosť"
                            stroke="#ff7f0e" strokeWidth={2} dot={false}
                            activeDot={hoverEnabled ? { r: 4 } : false}
                            isAnimationActive={false} connectNulls />
                        <Line yAxisId="tlak" type="monotone" dataKey="Tlak"
                            stroke="#2ca02c" strokeWidth={2} dot={false}
                            activeDot={hoverEnabled ? { r: 4 } : false}
                            isAnimationActive={false} connectNulls />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}