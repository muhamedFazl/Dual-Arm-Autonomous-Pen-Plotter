import React from 'react';

const DimensionInput = ({ width, height, onWidthChange, onHeightChange }) => {
    return (
        <div className="flex gap-4 items-center justify-center p-4 bg-gray-800/50 rounded-lg backdrop-blur-sm border border-gray-700">
            <div className="flex flex-col">
                <label className="text-xs text-gray-400 mb-1">Width (mm)</label>
                <input
                    type="number"
                    value={width}
                    onChange={(e) => onWidthChange(Number(e.target.value))}
                    className="bg-gray-900 border border-gray-600 rounded px-3 py-2 w-24 text-white focus:border-blue-500 outline-none transition-colors"
                    min="10"
                    max="500"
                />
            </div>
            <span className="text-gray-500 mt-4">×</span>
            <div className="flex flex-col">
                <label className="text-xs text-gray-400 mb-1">Height (mm)</label>
                <input
                    type="number"
                    value={height}
                    onChange={(e) => onHeightChange(Number(e.target.value))}
                    className="bg-gray-900 border border-gray-600 rounded px-3 py-2 w-24 text-white focus:border-blue-500 outline-none transition-colors"
                    min="10"
                    max="500"
                />
            </div>
        </div>
    );
};

export default DimensionInput;
