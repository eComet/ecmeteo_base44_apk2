import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { RefreshCw, CloudRain, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import MeteoChart from '../components/MeteoChart';

export default function Home() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        const response = await fetch('https://meteo.comet:9080/api/get-meta', {
            headers: { 'Authorization': 'Bearer GvYkwfJ7Zqz2yKIo4LLe' }
        });
        const arrayBuffer = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        let jsonData = null;
        for (const [filename, file] of Object.entries(zip.files)) {
            if (!file.dir && filename.endsWith('.json')) {
                const content = await file.async('string');
                jsonData = JSON.parse(content);
                break;
            }
        }
        if (!jsonData) {
            setError('Žiadny JSON súbor nenájdený v ZIP archíve');
        } else {
            setData(jsonData);
            setLastUpdated(new Date());
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const firstChart = data?.charts?.[0] ?? null;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                            <CloudRain className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">MeteoStation</h1>
                            <p className="text-xs text-gray-500">Monitorovanie senzorov v reálnom čase</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {lastUpdated && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                <Clock className="w-4 h-4" />
                                <span>Aktualizované: {format(lastUpdated, 'HH:mm:ss')}</span>
                            </div>
                        )}
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Obnoviť
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">

                {/* Meta info */}
                {data && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <p className="text-xs text-gray-500 mb-1">Počet záznamov</p>
                            <p className="text-2xl font-bold text-gray-900">{data.record_count?.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <p className="text-xs text-gray-500 mb-1">Vygenerované</p>
                            <p className="text-sm font-semibold text-gray-900 mt-1">
                                {data.generated_at ? format(new Date(data.generated_at), 'dd.MM.yyyy HH:mm') : '–'}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <p className="text-xs text-gray-500 mb-1">Verzia</p>
                            <p className="text-2xl font-bold text-gray-900">{data.version ?? '–'}</p>
                        </div>
                    </div>
                )}

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

                {/* Chart */}
                {!loading && !error && firstChart && (
                    <MeteoChart chart={firstChart} timestamps={data.timestamps} />
                )}
            </main>
        </div>
    );
}