import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Crosshair } from 'lucide-react';

const GCodeEditor = ({ gcode, currentLineIndex, selectedLineIndex, onLineSelect, lineToSegment, segments, playbackState }) => {
  const containerRef = useRef(null);
  const [followCurrentLine, setFollowCurrentLine] = useState(true);
  const lastSourceRef = useRef(null);
  
  // Custom virtualizer variables
  const lines = useMemo(() => gcode.split('\n'), [gcode]);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(600);
  
  const ITEM_HEIGHT = 36; // Increased from 28 to 36 for spaciousness
  const PADDING = 15; // Extra lines above/below to render
  
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      setHeight(entries[0].contentRect.height);
    });
    observer.observe(containerRef.current);
    setHeight(containerRef.current.getBoundingClientRect().height);
    return () => observer.disconnect();
  }, []);

  const handleScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const handleUserInteraction = () => {
    if (followCurrentLine) {
        setFollowCurrentLine(false);
    }
  };

  const activeRawLineIndex = (playbackState === 'playing' || playbackState === 'paused') 
    ? (segments[currentLineIndex]?.originalLineIndex ?? -1)
    : -1;
    
  const selectedRawLineIndex = selectedLineIndex !== null 
    ? (segments[selectedLineIndex]?.originalLineIndex ?? -1)
    : -1;

  // Auto-follow current line logic
  useEffect(() => {
    if (followCurrentLine && activeRawLineIndex >= 0 && containerRef.current) {
        const targetScrollTop = activeRawLineIndex * ITEM_HEIGHT - (height / 2);
        containerRef.current.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'auto' });
    }
  }, [followCurrentLine, activeRawLineIndex, height]);

  // Jump to selected line (from 3D visualizer)
  useEffect(() => {
      if (selectedRawLineIndex >= 0 && containerRef.current) {
          if (lastSourceRef.current === 'editor') {
              lastSourceRef.current = null; // Clear lock
              return;
          }
          setFollowCurrentLine(false);
          const targetScrollTop = selectedRawLineIndex * ITEM_HEIGHT - (height / 2);
          containerRef.current.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
      }
  }, [selectedLineIndex, selectedRawLineIndex, height]);

  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - PADDING);
  const endIndex = Math.min(lines.length - 1, Math.floor((scrollTop + height) / ITEM_HEIGHT) + PADDING);
  
  const visibleLines = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleLines.push(i);
  }

  const handleLineClick = (rawLineIndex) => {
    handleUserInteraction();
    const segmentIndex = lineToSegment[rawLineIndex];
    if (segmentIndex !== null && segmentIndex !== undefined && onLineSelect) {
      lastSourceRef.current = 'editor';
      onLineSelect(segmentIndex);
    } else {
      // Line is not linked to a motion segment
      lastSourceRef.current = 'editor';
      if (onLineSelect) onLineSelect(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-panel shadow-2xl overflow-hidden rounded-l-3xl">
      <div className="flex items-center justify-between p-6 shrink-0 bg-bg-panel z-10 relative">
        <h2 className="text-base font-bold text-text-primary tracking-widest uppercase mb-1">G-CODE</h2>
        <button 
          onClick={() => setFollowCurrentLine(!followCurrentLine)}
          className={`btn btn-sm text-xs gap-2 transition-all px-4 py-2 flex items-center ${followCurrentLine ? 'bg-accent-primary text-bg-primary shadow-md hover:opacity-90' : 'bg-transparent text-text-secondary hover:text-white hover:bg-bg-tertiary'} rounded-xl`}
          title="Jump to active executing line"
        >
          <Crosshair size={16} />
          <span className="font-semibold tracking-wider">FOLLOW</span>
        </button>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto bg-bg-primary relative custom-scrollbar font-mono text-[13px] tracking-wide"
        onScroll={handleScroll}
        onWheel={handleUserInteraction}
        onTouchMove={handleUserInteraction}
      >
        <div style={{ height: `${lines.length * ITEM_HEIGHT}px`, width: '100%', position: 'relative' }}>
            {visibleLines.map((i) => {
                const isPlayingLine = i === activeRawLineIndex;
                const isSelectedLine = i === selectedRawLineIndex;

                let bgClass = "hover:bg-bg-tertiary";
                let textClass = "text-text-muted";
                
                if (isSelectedLine) {
                  bgClass = "bg-bg-secondary";
                  textClass = "text-text-primary font-bold";
                } else if (isPlayingLine) {
                  bgClass = "bg-bg-tertiary";
                  textClass = "text-text-primary font-bold shadow-lg";
                } else {
                  bgClass = "hover:bg-bg-secondary";
                }

                return (
                    <div 
                        key={i}
                        className={`absolute w-full px-6 flex items-center cursor-pointer select-none transition-all duration-200 ${bgClass}`}
                        style={{ top: `${i * ITEM_HEIGHT}px`, height: `${ITEM_HEIGHT}px` }}
                        onClick={() => handleLineClick(i)}
                    >
                        <span className="w-12 shrink-0 text-text-muted opacity-30 text-right pr-4 text-[11px] font-bold select-none">{i + 1}</span>
                        <span className={`truncate ${textClass} ml-2`}>{lines[i]}</span>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default GCodeEditor;
