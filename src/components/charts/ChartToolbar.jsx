import React from 'react';
import { Move, ZoomIn, RotateCcw, Download, Eye, EyeOff, MousePointer, ArrowUpDown } from 'lucide-react';

const tools = [
    { id: 'pan',    Icon: Move,         title: 'Pan – posúvanie grafu' },
    { id: 'zoom',   Icon: ZoomIn,       title: 'Box Zoom – výber oblasti' },
    { id: 'reset',  Icon: RotateCcw,    title: 'Reset pohľadu',          action: true },
    { id: 'save',   Icon: Download,     title: 'Uložiť obrázok',         action: true },
];

export default function ChartToolbar({
    activeTool, setActiveTool,
    showLegend, setShowLegend,
    hoverEnabled, setHoverEnabled,
    showMinMax, setShowMinMax,
    onReset, onSave,
}) {
    const handleClick = (tool) => {
        if (tool.id === 'reset') { onReset?.(); return; }
        if (tool.id === 'save')  { onSave?.();  return; }
        setActiveTool(prev => prev === tool.id ? null : tool.id);
    };

    return (
        <div className="flex flex-col gap-1 absolute top-2 right-2 z-10 bg-white border border-gray-200 rounded-lg shadow-sm p-1">
            {tools.map(({ id, Icon, title }) => (
                <button
                    key={id}
                    title={title}
                    onClick={() => handleClick({ id })}
                    className={`w-8 h-8 flex items-center justify-center rounded transition-colors
                        ${!['reset','save'].includes(id) && activeTool === id
                            ? 'bg-blue-100 text-blue-600'
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
                >
                    <Icon className="w-4 h-4" />
                </button>
            ))}

            {/* Divider */}
            <div className="border-t border-gray-200 my-0.5" />

            {/* Show/Hide Legend */}
            <button
                title={showLegend ? 'Skryť legendu' : 'Zobraziť legendu'}
                onClick={() => setShowLegend(p => !p)}
                className={`w-8 h-8 flex items-center justify-center rounded transition-colors
                    ${showLegend ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
            >
                {showLegend ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            {/* Hover tooltip toggle */}
            <button
                title={hoverEnabled ? 'Vypnúť hover' : 'Zapnúť hover'}
                onClick={() => setHoverEnabled(p => !p)}
                className={`w-8 h-8 flex items-center justify-center rounded transition-colors
                    ${hoverEnabled ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
            >
                <MousePointer className="w-4 h-4" />
            </button>

            {/* Min/Max toggle */}
            {setShowMinMax && (
                <button
                    title={showMinMax ? 'Skryť min/max' : 'Zobraziť min/max'}
                    onClick={() => setShowMinMax(p => !p)}
                    className={`w-8 h-8 flex items-center justify-center rounded transition-colors
                        ${showMinMax ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
                >
                    <ArrowUpDown className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}