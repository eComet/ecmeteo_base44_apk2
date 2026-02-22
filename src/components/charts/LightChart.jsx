import React, { useState, useRef, useCallback } from 'react';
import {
    ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, ReferenceLine, ReferenceArea
} from 'recharts';
import { format, parseISO } from 'date-fns';
import ChartToolbar from './ChartToolbar';

const THRESHOLD_LOW = 2000;
const THRESHOLD_MID = 10000;
const THRESHOLD_HIGH = 100000;

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
            {payload.filter(p => p.name === 'Svietivosť' && p.value != null).map((p, i) => (
                <p key={i} style={{ color: p.color }} className="font-semibold">
                    Svietivosť: {typeof p.value === 'number' ? p.value.toFixed(0) : p.value} lux
                </p>
            ))}
        </div>
    );
};

export default function LightChart({ timestamps, series }) {
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

    const amblSeries = series[0];
    const allData = timestamps.map((ts, i) => {
        const v = amblSeries?.data[i] ?? 0;
        return { ts, Svietivosť: v, low: Math.min(v, THRESHOLD_LOW), mid: Math.min(v, THRESHOLD_MID), high: Math.min(v, THRESHOLD_HIGH), top: v };
    });

    const data = zoomRange
        ? allData.filter(d => { const ms = parseTs(d.ts); return ms >= zoomRange.start && ms <= zoomRange.end; })
        : allData;

    const rawMax = Math.max(...data.map(d => d.Svietivosť), 1);
    const paddedMax = rawMax * 1.1;
    const luxMax = Math.ceil(paddedMax / 10000) * 10000;
    const luxTicks = Array.from({ length: Math.floor(luxMax / 10000) + 1 }, (_, i) => i * 10000);

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

    const luxMM = findMinMax('Svietivosť');

    const MinMaxDot = ({ cx, cy, value, color, isMax }) => {
        if (cx == null || cy == null || value == null) return null;
        const dotColor = shadeColor(color, isMax);
        return (
            <g>
                <circle cx={cx} cy={cy} r={5} fill={dotColor} stroke="#fff" strokeWidth={1.5} />
                <text x={cx} y={cy - 9} textAnchor="middle" fontSize={10} fill={dotColor} fontWeight="600">{value.toFixed(0)} lux</text>
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
            a.download = 'light_chart.png';
            a.href = canvas.toDataURL('image/png'); a.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }, []);

    const handleReset = useCallback(() => { setZoomRange(null); setZoomArea(null); }, []);

    const CustomLegend = () => (
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', paddingBottom: '2px', paddingTop: '4px' }}>
            {['Svietivosť'].map(key => {
                const hidden = hiddenSeries[key];
                return (
                    <span key={key} onClick={() => setHiddenSeries(prev => ({ ...prev, [key]: !prev[key] }))}
                        style={{ cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', color: hidden ? '#9ca3af' : '#374151', userSelect: 'none' }}>
                        <svg width="14" height="4"><line x1="0" y1="2" x2="14" y2="2" stroke={hidden ? '#9ca3af' : '#ff7f0e'} strokeWidth="2.5" /></svg>
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
        return { tsVal: tsMin + xFrac * (tsMax - tsMin) };
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
    const handleMouseUp = () => {
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative landscape:p-3">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Graf Svietivosť</h2>
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
                    <ComposedChart data={data} margin={{ top: 8, right: 30, left: 10, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            dataKey="ts"
                            tickFormatter={fmtTime}
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            tickCount={8} axisLine={false} tickLine={false}
                            label={{ value: 'Čas', position: 'insideBottom', offset: -10, fill: '#6b7280', fontSize: 11 }}
                        />
                        <YAxis
                            domain={[0, luxMax]}
                            ticks={luxTicks}
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            axisLine={{ stroke: '#d1d5db' }}
                            tickLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                            width={65}
                            tickFormatter={v => `${Math.round(v)}`}
                            label={{ value: 'Svietivosť (lux)', angle: -90, position: 'insideLeft', offset: 10, fill: '#6b7280', fontSize: 11 }}
                        />
                        <Tooltip content={hoverEnabled ? <CustomTooltip /> : <span />} active={hoverEnabled ? undefined : false} />
                        {showLegend && (
                            <Legend verticalAlign="bottom" align="center" content={<CustomLegend />} wrapperStyle={{ paddingTop: '12px' }} />
                        )}
                        <Area type="monotone" dataKey="low"  fill="#93c5fd" stroke="none" fillOpacity={0.5} legendType="none" isAnimationActive={false} />
                        <Area type="monotone" dataKey="mid"  fill="#fde68a" stroke="none" fillOpacity={0.4} legendType="none" isAnimationActive={false} />
                        <Area type="monotone" dataKey="high" fill="#fb923c" stroke="none" fillOpacity={0.4} legendType="none" isAnimationActive={false} />
                        <Area type="monotone" dataKey="top"  fill="#f87171" stroke="none" fillOpacity={0.3} legendType="none" isAnimationActive={false} />
                        <Line type="monotone" dataKey="Svietivosť" stroke="#ff7f0e" strokeWidth={2}
                            dot={showMinMax ? (props) => {
                                const { cx, cy, payload } = props;
                                const isMin = luxMM.min && payload.ts === luxMM.min.ts;
                                const isMax = luxMM.max && payload.ts === luxMM.max.ts;
                                if (!isMin && !isMax) return null;
                                return <MinMaxDot key={`lux-${payload.ts}`} cx={cx} cy={cy} value={payload.Svietivosť} color="#ff7f0e" isMax={isMax} />;
                            } : false}
                            isAnimationActive={false} activeDot={hoverEnabled ? { r: 4 } : false} hide={!!hiddenSeries['Svietivosť']} />
                        <ReferenceLine y={THRESHOLD_LOW}  stroke="#fde047" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: '2 000 lux',   fill: '#b45309', fontSize: 10, position: 'insideTopRight' }} />
                        <ReferenceLine y={THRESHOLD_MID}  stroke="#f97316" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: '10 000 lux',  fill: '#c2410c', fontSize: 10, position: 'insideTopRight' }} />
                        <ReferenceLine y={THRESHOLD_HIGH} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: '100 000 lux', fill: '#b91c1c', fontSize: 10, position: 'insideTopRight' }} />
                        {zoomArea && <ReferenceArea x1={zoomArea.x1} x2={zoomArea.x2} fill="#3b82f6" fillOpacity={0.15} strokeOpacity={0.3} />}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}