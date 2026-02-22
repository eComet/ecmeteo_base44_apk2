import React, { useState, useRef, useCallback } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, ReferenceLine, ReferenceArea
} from 'recharts';
import { format, parseISO } from 'date-fns';
import ChartToolbar from './ChartToolbar';

const THRESHOLD_LOW = 20;
const THRESHOLD_MID = 40;
const THRESHOLD_HIGH = 100;

function parseTs(ts) {
    if (typeof ts === 'number') return ts;
    try { return parseISO(ts.replace(' ', 'T')).getTime(); } catch { return null; }
}
function fmtTime(ts) {
    try { return format(parseISO(String(ts).replace(' ', 'T')), 'HH:mm'); } catch { return ts; }
}
function fmtTooltip(ts) {
    try { return format(parseISO(String(ts).replace(' ', 'T')), 'dd.MM.yyyy HH:mm'); } catch { return ts; }
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
            <p className="text-gray-500 mb-2 font-medium">{fmtTooltip(label)}</p>
            {payload.map((p, i) => p.value != null && (
                <p key={i} style={{ color: p.color }} className="font-semibold">
                    {p.name}: {typeof p.value === 'number' ? p.value.toFixed(0) : p.value} μg/m³
                </p>
            ))}
        </div>
    );
};

export default function PmChart({ timestamps, series }) {
    const [activeTool, setActiveTool] = useState('hover');
    const [showLegend, setShowLegend] = useState(true);
    const [hoverEnabled, setHoverEnabled] = useState(true);
    const [hiddenSeries, setHiddenSeries] = useState({});
    const [showMinMax, setShowMinMax] = useState(false);
    const [zoomArea, setZoomArea] = useState(null);
    const [zoomRange, setZoomRange] = useState(null);
    const isSelecting = useRef(false);
    const panStart = useRef(null);
    const panRangeAtStart = useRef(null);
    const chartRef = useRef(null);

    if (!timestamps?.length || !series) return null;

    const [pm1_0, pm2_5, pm10] = series;

    const allData = timestamps.map((ts, i) => ({
        ts,
        'PM1.0': pm1_0?.data[i] ?? null,
        'PM2.5': pm2_5?.data[i] ?? null,
        'PM10':  pm10?.data[i]  ?? null,
    }));

    const data = zoomRange
        ? allData.filter(d => { const ms = parseTs(d.ts); return ms >= zoomRange.start && ms <= zoomRange.end; })
        : allData;

    const TICK_COUNT = 8;

    function niceDomain(min, max, steps) {
        const niceMin = Math.floor(min);
        const niceMax = Math.ceil(max);
        const step = Math.ceil((niceMax - niceMin) / (steps - 1));
        return { min: niceMin, max: niceMax, step };
    }
    function makeTicks(niceMin, niceMax, step) {
        const ticks = [];
        for (let v = niceMin; v <= niceMax + 0.001; v += step) ticks.push(Math.round(v));
        return ticks;
    }

    const allPmValues = data.flatMap(d => [d['PM1.0'], d['PM2.5'], d['PM10']]).filter(v => v != null);
    const pmMin = 0;
    const pmRawMax = allPmValues.length ? Math.max(...allPmValues) : THRESHOLD_HIGH;
    const pmPaddedMax = pmRawMax * 1.1;
    const pmMax = Math.ceil(pmPaddedMax / 10) * 10;
    const pmTicks = Array.from({ length: Math.floor(pmMax / 10) + 1 }, (_, i) => i * 10);

    function shadeColor(hex, isMax) {
        const r = parseInt(hex.slice(1,3),16);
        const g = parseInt(hex.slice(3,5),16);
        const b = parseInt(hex.slice(5,7),16);
        const [tr,tg,tb] = isMax ? [0,0,0] : [255,255,255];
        const f = 0.45;
        return `rgb(${Math.round(r+(tr-r)*f)},${Math.round(g+(tg-g)*f)},${Math.round(b+(tb-b)*f)})`;
    }

    function findMinMax(key) {
        const valid = data.filter(d => d[key] != null);
        if (!valid.length) return { min: null, max: null };
        const maxPt = valid.reduce((a, b) => b[key] > a[key] ? b : a);
        const minPt = valid.reduce((a, b) => b[key] < a[key] ? b : a);
        return { min: minPt, max: maxPt };
    }

    const pm10MM = findMinMax('PM10');
    const pm25MM = findMinMax('PM2.5');
    const pm10MM2 = findMinMax('PM1.0');

    const MinMaxDot = ({ cx, cy, value, unit, color, isMax }) => {
        if (cx == null || cy == null || value == null) return null;
        const dotColor = shadeColor(color, isMax);
        return (
            <g>
                <circle cx={cx} cy={cy} r={5} fill={dotColor} stroke="#fff" strokeWidth={1.5} />
                <text x={cx} y={cy - 9} textAnchor="middle" fontSize={10} fill={dotColor} fontWeight="600">{value.toFixed(0)} {unit}</text>
            </g>
        );
    };

    const handleSave = useCallback(() => {
        const svgEl = chartRef.current?.querySelector('svg');
        if (!svgEl) return;
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const canvas = document.createElement('canvas');
        const rect = svgEl.getBoundingClientRect();
        canvas.width = rect.width; canvas.height = rect.height;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const a = document.createElement('a');
            a.download = 'pm_chart.png';
            a.href = canvas.toDataURL('image/png'); a.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }, []);

    const handleReset = useCallback(() => { setZoomRange(null); setZoomArea(null); }, []);

    const PM_COLORS = { 'PM1.0': '#1f77b4', 'PM2.5': '#ff7f0e', 'PM10': '#2ca02c' };
    const CustomLegend = () => (
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', paddingBottom: '2px', paddingTop: '4px' }}>
            {['PM1.0', 'PM2.5', 'PM10'].map(key => {
                const hidden = hiddenSeries[key];
                return (
                    <span key={key} onClick={() => setHiddenSeries(prev => ({ ...prev, [key]: !prev[key] }))}
                        style={{ cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', color: hidden ? '#9ca3af' : '#374151', userSelect: 'none' }}>
                        <svg width="14" height="4"><line x1="0" y1="2" x2="14" y2="2" stroke={hidden ? '#9ca3af' : PM_COLORS[key]} strokeWidth="2.5" /></svg>
                        {key}
                    </span>
                );
            })}
        </div>
    );

    const getXFracTs = (e) => {
        const chart = e.currentTarget.querySelector('.recharts-wrapper');
        if (!chart) return null;
        const rect = chart.getBoundingClientRect();
        const xFrac = (e.clientX - rect.left) / rect.width;
        const visibleTs = data.map(d => parseTs(d.ts));
        const tsMin = Math.min(...visibleTs), tsMax = Math.max(...visibleTs);
        return { tsVal: tsMin + xFrac * (tsMax - tsMin), rect, xFrac, tsMin, tsMax };
    };

    const handleMouseDown = (e) => {
        if (activeTool === 'zoom') {
            const r = getXFracTs(e); if (!r) return;
            isSelecting.current = true;
            setZoomArea({ x1: r.tsVal, x2: r.tsVal });
        }
        if (activeTool === 'pan') {
            const visibleTs = data.map(d => parseTs(d.ts));
            panStart.current = e.clientX;
            panRangeAtStart.current = { start: zoomRange?.start ?? Math.min(...visibleTs), end: zoomRange?.end ?? Math.max(...visibleTs) };
        }
    };
    const handleMouseMove = (e) => {
        if (activeTool === 'zoom' && isSelecting.current) {
            const r = getXFracTs(e); if (!r) return;
            setZoomArea(prev => ({ ...prev, x2: r.tsVal }));
        }
        if (activeTool === 'pan' && panStart.current !== null) {
            const chart = e.currentTarget.querySelector('.recharts-wrapper');
            if (!chart) return;
            const rect = chart.getBoundingClientRect();
            const dxFrac = (e.clientX - panStart.current) / rect.width;
            const { start, end } = panRangeAtStart.current;
            const span = end - start;
            const allTs = allData.map(d => parseTs(d.ts));
            let newStart = start - dxFrac * span, newEnd = end - dxFrac * span;
            const totalMin = Math.min(...allTs), totalMax = Math.max(...allTs);
            if (newStart < totalMin) { newStart = totalMin; newEnd = totalMin + span; }
            if (newEnd > totalMax) { newEnd = totalMax; newStart = totalMax - span; }
            setZoomRange({ start: newStart, end: newEnd });
        }
    };
    const handleMouseUp = (e) => {
        if (activeTool === 'zoom' && isSelecting.current && zoomArea) {
            isSelecting.current = false;
            const { x1, x2 } = zoomArea;
            if (Math.abs(x2 - x1) > 1000) setZoomRange({ start: Math.min(x1, x2), end: Math.max(x1, x2) });
            setZoomArea(null);
        }
        if (activeTool === 'pan') panStart.current = null;
    };

    const cursor = activeTool === 'pan' ? 'grab' : activeTool === 'zoom' ? 'crosshair' : 'default';

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative" style={{ transform: 'rotate(270deg)', transformOrigin: 'center', width: '100vh', height: 'auto' }}>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 ">Graf PM častice</h2>
            <ChartToolbar
                activeTool={activeTool} setActiveTool={setActiveTool}
                showLegend={showLegend} setShowLegend={setShowLegend}
                hoverEnabled={hoverEnabled} setHoverEnabled={setHoverEnabled}
                showMinMax={showMinMax} setShowMinMax={setShowMinMax}
                onReset={handleReset} onSave={handleSave}
            />
            <div ref={chartRef} style={{ cursor, userSelect: 'none' }}
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={data} margin={{ top: 8, right: 30, left: 10, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            dataKey="ts"
                            tickFormatter={fmtTime}
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            tickCount={8} axisLine={false} tickLine={false}
                            label={{ value: 'Čas', position: 'insideBottom', offset: -10, fill: '#6b7280', fontSize: 11 }}
                        />
                        <YAxis
                            domain={[pmMin, pmMax]}
                            ticks={pmTicks}
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            axisLine={{ stroke: '#d1d5db' }}
                            tickLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                            width={55}
                            tickFormatter={v => `${Math.round(v)}`}
                            label={{ value: 'Koncentrácia (μg/m³)', angle: -90, position: 'insideLeft', offset: 10, fill: '#6b7280', fontSize: 11 }}
                        />
                        <Tooltip content={hoverEnabled ? <CustomTooltip /> : <span />} active={hoverEnabled ? undefined : false} />
                        {showLegend && (
                            <Legend verticalAlign="bottom" align="center" content={<CustomLegend />} wrapperStyle={{ paddingTop: '12px' }} />
                        )}
                        <ReferenceLine y={THRESHOLD_LOW} stroke="#3b82f6" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: '20 μg/m³', fill: '#3b82f6', fontSize: 10, position: 'insideTopRight' }} />
                        <ReferenceLine y={THRESHOLD_MID} stroke="#f97316" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: '40 μg/m³', fill: '#f97316', fontSize: 10, position: 'insideTopRight' }} />
                        <ReferenceLine y={THRESHOLD_HIGH} stroke="#a855f7" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: '100 μg/m³', fill: '#a855f7', fontSize: 10, position: 'insideTopRight' }} />
                        {zoomArea && <ReferenceArea x1={zoomArea.x1} x2={zoomArea.x2} fill="#3b82f6" fillOpacity={0.15} strokeOpacity={0.3} />}
                        <Line type="monotone" dataKey="PM1.0" stroke="#1f77b4" strokeWidth={2}
                            dot={showMinMax ? (props) => {
                                const { cx, cy, payload } = props;
                                const isMin = pm10MM2.min && payload.ts === pm10MM2.min.ts;
                                const isMax = pm10MM2.max && payload.ts === pm10MM2.max.ts;
                                if (!isMin && !isMax) return null;
                                return <MinMaxDot key={`pm10-${payload.ts}`} cx={cx} cy={cy} value={payload['PM1.0']} unit="μg/m³" color="#1f77b4" isMax={isMax} />;
                            } : false}
                            isAnimationActive={false} activeDot={hoverEnabled ? { r: 4 } : false} hide={!!hiddenSeries['PM1.0']} />
                        <Line type="monotone" dataKey="PM2.5" stroke="#ff7f0e" strokeWidth={2}
                            dot={showMinMax ? (props) => {
                                const { cx, cy, payload } = props;
                                const isMin = pm25MM.min && payload.ts === pm25MM.min.ts;
                                const isMax = pm25MM.max && payload.ts === pm25MM.max.ts;
                                if (!isMin && !isMax) return null;
                                return <MinMaxDot key={`pm25-${payload.ts}`} cx={cx} cy={cy} value={payload['PM2.5']} unit="μg/m³" color="#ff7f0e" isMax={isMax} />;
                            } : false}
                            isAnimationActive={false} activeDot={hoverEnabled ? { r: 4 } : false} hide={!!hiddenSeries['PM2.5']} />
                        <Line type="monotone" dataKey="PM10" stroke="#2ca02c" strokeWidth={2}
                            dot={showMinMax ? (props) => {
                                const { cx, cy, payload } = props;
                                const isMin = pm10MM.min && payload.ts === pm10MM.min.ts;
                                const isMax = pm10MM.max && payload.ts === pm10MM.max.ts;
                                if (!isMin && !isMax) return null;
                                return <MinMaxDot key={`pm10h-${payload.ts}`} cx={cx} cy={cy} value={payload['PM10']} unit="μg/m³" color="#2ca02c" isMax={isMax} />;
                            } : false}
                            isAnimationActive={false} activeDot={hoverEnabled ? { r: 4 } : false} hide={!!hiddenSeries['PM10']} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}