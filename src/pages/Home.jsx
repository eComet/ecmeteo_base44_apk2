import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { RefreshCw, CloudRain, AlertCircle, Clock, RotateCw } from 'lucide-react';
import { format } from 'date-fns';
import ThpChart from '../components/charts/ThpChart';
import PmChart from '../components/charts/PmChart';
import LightChart from '../components/charts/LightChart';

export default function Home() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [expandedChart, setExpandedChart] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await base44.functions.invoke('fetchSensorData', {});
            setData(response.data);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err.message || 'Nepodarilo sa načítať dáta');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const chartsById = data?.charts ? Object.fromEntries(data.charts.map(c => [c.id, c])) : {};
    const timestamps = data?.timestamps ?? [];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 sm:w-10 h-8 sm:h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <CloudRain className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold text-gray-900">MeteoStation</h1>
                            <p className="text-xs text-gray-500 hidden sm:block">Monitorovanie senzorov v reálnom čase</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                        {lastUpdated && (
                            <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 hidden md:flex">
                                <Clock className="w-4 h-4" />
                                <span>{format(lastUpdated, 'HH:mm:ss')}</span>
                            </div>
                        )}
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors flex-shrink-0"
                        >
                            <RefreshCw className={`w-3 sm:w-4 h-3 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Obnoviť</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Portrait mode message */}
                        <style>{`
                            @media (orientation: portrait) {
                                .charts-container {
                                    display: none !important;
                                }
                                .portrait-message {
                                    display: flex !important;
                                }
                            }
                            @media (orientation: landscape) {
                                .portrait-message {
                                    display: none !important;
                                }
                            }
                        `}</style>

                        {/* Portrait Only Message */}
                        <div className="portrait-message hidden min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
                            <RotateCw className="w-24 h-24 text-blue-600 mb-6 animate-spin" />
                            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Landscape mode required</h2>
                            <p className="text-lg text-gray-600 text-center">please rotate your phone →</p>
                        </div>

                        {/* Content */}
                        <main className="charts-container max-w-6xl mx-auto px-6 py-8">

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-gray-500 text-sm">Načítavam dáta zo senzorov…</p>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-5 text-red-700">
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-semibold">Chyba pri načítaní dát</p>
                            <p className="text-sm mt-1 text-red-600">{error}</p>
                        </div>
                    </div>
                )}

                {/* Chart selector list */}
                {!loading && !error && data && !expandedChart && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Dostupné grafy</h2>
                        <div className="space-y-2">
                            {[
                                { id: 'thp', label: 'Graf Teplota / Vlhkosť / Tlak' },
                                { id: 'pm', label: 'Graf PM častice' },
                                { id: 'light', label: 'Graf Svietivosť' }
                            ].map(chart => (
                                <button
                                    key={chart.id}
                                    onClick={() => setExpandedChart(chart.id)}
                                    className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium transition-colors border border-transparent hover:border-blue-200"
                                >
                                    {chart.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Expanded chart view */}
                {!loading && !error && data && expandedChart && (
                    <div>
                        <button
                            onClick={() => setExpandedChart(null)}
                            className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium rounded-lg transition-colors"
                        >
                            ← Späť na výber grafov
                        </button>
                        <div className="grid grid-cols-1 gap-6">
                            {expandedChart === 'thp' && <ThpChart timestamps={timestamps} series={chartsById['thp']?.series} />}
                            {expandedChart === 'pm' && <PmChart timestamps={timestamps} series={chartsById['pm']?.series} />}
                            {expandedChart === 'light' && <LightChart timestamps={timestamps} series={chartsById['light']?.series} />}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}