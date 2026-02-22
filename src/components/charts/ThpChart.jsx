import React, { useState, useRef, useCallback } from 'react';
import {
    ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, ReferenceArea, ReferenceLine
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
    const [hiddenSeries, setHiddenSeries] = useState({});
    const [showMinMax, setShowMinMax] = useState(false);

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

    const TICK_COUNT = 8;

    // Compute evenly-spaced ticks fitting within [min, max]
    function niceDomain(min, max, steps) {
        const niceMin = Math.floor(min);
        const niceMax = Math.ceil(max);
        // step that fits exactly steps ticks within the range
        const step = Math.ceil((niceMax - niceMin) / (steps - 1));
        return { min: niceMin, max: niceMax, step };
    }
    function makeTicks(niceMin, niceMax, step) {
        const ticks = [];
        for (let v = niceMin; v <= niceMax + 0.001; v += step) ticks.push(Math.round(v));
        return ticks;
    }

    function paddedRange(values) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const span = max - min || 1;
        return { min: min - span * 0.05, max: max + span * 0.1 };
    }

    const tepRange  = nonNullTep.length  ? paddedRange(nonNullTep)  : { min: -5,  max: 40   };
    const vlhRange  = nonNullVlh.length  ? paddedRange(nonNullVlh)  : { min: 0,   max: 105  };
    const tlakRange = nonNullTlak.length ? paddedRange(nonNullTlak) : { min: 990, max: 1030 };

    const rawTepMin  = tepRange.min;  const rawTepMax  = tepRange.max;
    const rawVlhMin  = vlhRange.min;  const rawVlhMax  = vlhRange.max;
    const rawTlakMin = tlakRange.min; const rawTlakMax = tlakRange.max;

    const tepDomain  = niceDomain(rawTepMin,  rawTepMax,  TICK_COUNT);
    const vlhDomain  = niceDomain(rawVlhMin,  rawVlhMax,  TICK_COUNT);
    const tlakDomain = niceDomain(rawTlakMin, rawTlakMax, TICK_COUNT);

    const tepMin  = tepDomain.min;  const tepMax  = tepDomain.max;
    const vlhMin  = vlhDomain.min;  const vlhMax  = vlhDomain.max;
    const tlakMin = tlakDomain.min; const tlakMax = tlakDomain.max;

    const tepTicks  = makeTicks(tepDomain.min,  tepDomain.max,  tepDomain.step);
    const vlhTicks  = makeTicks(vlhDomain.min,  vlhDomain.max,  vlhDomain.step);
    const tlakTicks = makeTicks(tlakDomain.min, tlakDomain.max, tlakDomain.step);

    // Min/Max points for visible data
    function findMinMax(key) {
        const valid = data.filter(d => d[key] != null);
        if (!valid.length) return { min: null, max: null };
        const maxPt = valid.reduce((a, b) => b[key] > a[key] ? b : a);
        const minPt = valid.reduce((a, b) => b[key] < a[key] ? b : a);
        return { min: minPt, max: maxPt };
    }
    const tepMM  = findMinMax('Teplota');
    const vlhMM  = findMinMax('Vlhkosť');
    const tlakMM = findMinMax('Tlak');

    const MinMaxDot = ({ cx, cy, value, unit, decimals = 2 }) => {
        if (cx == null || cy == null || value == null) return null;
        const label = `${value.toFixed(decimals)} ${unit}`;
        return (
            <g>
                <circle cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#fff" strokeWidth={1.5} />
                <text x={cx} y={cy - 9} textAnchor="middle" fontSize={10} fill="#ef4444" fontWeight="600">{label}</text>
            </g>
        );
    };

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

    const handleLegendClick = (e) => {
        const key = e.dataKey;
        setHiddenSeries(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const SERIES_COLORS = { Teplota: '#1f77b4', Vlhkosť: '#ff7f0e', Tlak: '#2ca02c' };

    const CustomLegend = () => (
        <div style={{ display: 'flex', gap: '16px', paddingLeft: '70px', paddingBottom: '2px', paddingTop: '4px' }}>
            {['Teplota', 'Vlhkosť', 'Tlak'].map(key => {
                const hidden = hiddenSeries[key];
                return (
                    <span
                        key={key}
                        onClick={() => setHiddenSeries(prev => ({ ...prev, [key]: !prev[key] }))}
                        style={{ cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', color: hidden ? '#9ca3af' : '#374151', userSelect: 'none' }}
                    >
                        <svg width="14" height="4"><line x1="0" y1="2" x2="14" y2="2" stroke={hidden ? '#9ca3af' : SERIES_COLORS[key]} strokeWidth="2.5" /></svg>
                        {key}
                    </span>
                );
            })}
        </div>
    );

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
                    <ComposedChart data={data} margin={{ top: 10, right: 80, left: 10, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" horizontal={true} vertical={true} />

                        <XAxis
                            dataKey="ts"
                            tickFormatter={fmtTime}
                            tick={{ fontSize: 11, fill: '#6b7280' }}
                            tickCount={10}
                            axisLine={{ stroke: '#d1d5db' }}
                            tickLine={false}
                            minTickGap={40}
                            label={{ value: 'Čas', position: 'insideBottom', offset: -10, fill: '#6b7280', fontSize: 11 }}
                        />

                        <YAxis
                            yAxisId="teplota"
                            orientation="left"
                            domain={[tepMin, tepMax]}
                            ticks={tepTicks}
                            tick={{ fontSize: 11, fill: '#1f77b4' }}
                            axisLine={{ stroke: '#1f77b4' }}
                            tickLine={{ stroke: '#1f77b4', strokeWidth: 1 }}
                            width={70}
                            tickFormatter={v => `${Math.round(v)} °C`}
                            label={{ value: 'Teplota (°C)', angle: -90, position: 'insideLeft', offset: 15, fill: '#1f77b4', fontSize: 11 }}
                        />
                        <YAxis
                            yAxisId="vlhkost"
                            orientation="right"
                            domain={[vlhMin, vlhMax]}
                            ticks={vlhTicks}
                            tick={{ fontSize: 11, fill: '#ff7f0e' }}
                            axisLine={{ stroke: '#ff7f0e' }}
                            tickLine={{ stroke: '#ff7f0e', strokeWidth: 1 }}
                            width={65}
                            tickFormatter={v => `${Math.round(v)} %`}
                            label={{ value: 'Vlhkosť (%)', angle: 90, position: 'insideRight', offset: 15, fill: '#ff7f0e', fontSize: 11 }}
                        />
                        <YAxis
                            yAxisId="tlak"
                            orientation="right"
                            domain={[tlakMin, tlakMax]}
                            ticks={tlakTicks}
                            tick={{ fontSize: 11, fill: '#2ca02c' }}
                            axisLine={{ stroke: '#2ca02c' }}
                            tickLine={{ stroke: '#2ca02c', strokeWidth: 1 }}
                            width={85}
                            tickFormatter={v => `${Math.round(v)} hPa`}
                            label={{ value: 'Tlak (hPa)', angle: 90, position: 'insideRight', offset: 15, fill: '#2ca02c', fontSize: 11 }}
                        />

                        <Tooltip
                            content={hoverEnabled ? <CustomTooltip /> : null}
                            active={hoverEnabled ? undefined : false}
                        />

                        {showLegend && (
                            <Legend
                                verticalAlign="top"
                                align="left"
                                content={<CustomLegend />}
                                wrapperStyle={{ paddingBottom: '8px' }}
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
                            isAnimationActive={false} connectNulls hide={!!hiddenSeries['Teplota']} />
                        <Line yAxisId="vlhkost" type="monotone" dataKey="Vlhkosť"
                            stroke="#ff7f0e" strokeWidth={2} dot={false}
                            activeDot={hoverEnabled ? { r: 4 } : false}
                            isAnimationActive={false} connectNulls hide={!!hiddenSeries['Vlhkosť']} />
                        <Line yAxisId="tlak" type="monotone" dataKey="Tlak"
                            stroke="#2ca02c" strokeWidth={2} dot={false}
                            activeDot={hoverEnabled ? { r: 4 } : false}
                            isAnimationActive={false} connectNulls hide={!!hiddenSeries['Tlak']} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}