import React, { useRef, useEffect } from 'react';
import { FileText } from 'lucide-react';

const GcodeViewer = ({ gcode, onLineClick, highlightedLine }) => {
    const scrollRef = useRef(null);

    // Auto-scroll to highlighted line
    useEffect(() => {
        if (scrollRef.current && highlightedLine !== null) {
            const lineEl = scrollRef.current.children[highlightedLine];
            if (lineEl) {
                lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [highlightedLine]);

    const lines = gcode ? gcode.split('\n') : [];

    return (
        <div className="glass-panel h-full flex flex-col p-4 relative">
            <div className="flex items-center justify-between mb-2 shrink-0">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText size={20} className="text-accent-secondary" />
                    G-Code Editor
                </h3>
                <span className="text-xs text-text-muted">{lines.length} lines</span>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 w-full bg-slate-900/50 border border-slate-700/50 rounded p-2 text-xs font-mono text-text-muted overflow-auto custom-scrollbar"
            >
                {lines.length > 0 ? lines.map((line, i) => (
                    <div
                        key={i}
                        onClick={() => onLineClick(i)}
                        className={`px-1 py-0.5 whitespace-pre cursor-pointer hover:bg-white/5 ${highlightedLine === i ? 'bg-accent-primary/20 text-accent-primary font-bold' : ''}`}
                    >
                        <span className="inline-block w-8 text-text-muted/30 select-none text-right mr-3">{i + 1}</span>
                        {line}
                    </div>
                )) : (
                    <div className="text-text-muted/30 italic p-2">Load a G-code file to view...</div>
                )}
            </div>
        </div>
    );
};

export default GcodeViewer;
