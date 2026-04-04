import React from 'react';

const MachineStatusPanel = ({ machineStatus, playbackState, progress, onFeedrateChange }) => {
  const isStreaming = playbackState === 'playing' || playbackState === 'paused';

  return (
    <div className="flex flex-col bg-bg-secondary p-8 rounded-2xl shadow-lg mx-6 mt-6 mb-3 gap-8 shrink-0">
      
      {/* Section 1: Spindle Location and Feedrate */}
      <div>
        <h2 className="text-sm font-bold text-text-muted mb-3 uppercase tracking-wider">Spindle Location</h2>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary font-mono">X</span>
            <span className="text-black font-mono text-lg">{machineStatus.x.toFixed(3)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary font-mono">Y</span>
            <span className="text-black font-mono text-lg">{machineStatus.y.toFixed(3)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary font-mono">Z</span>
            <span className="text-black font-mono text-lg">{machineStatus.z.toFixed(3)}</span>
          </div>
          <div className="mt-4 pt-4 flex justify-between items-center border-t border-white/5">
            <span className="text-sm text-text-muted font-mono tracking-widest uppercase">Feed</span>
            <div className="flex items-center gap-2">
              <input
                type="text" // Change to 'text' to allow easier editing while still validating
                pattern="[0-9]*"
                value={machineStatus.feedrate}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^[0-9]+$/.test(val)) {
                    onFeedrateChange(val);
                  }
                }}
                className="w-20 bg-bg-primary border-none text-text-primary font-mono text-xl text-right focus:ring-1 focus:ring-accent-primary/20 rounded-lg p-1 px-2"
                title="Edit default feedrate (F)"
              />
              <span className="text-[10px] text-text-muted font-mono pb-1">MM/M</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Drawing Status */}
      <div className={`transition-opacity duration-300 ${isStreaming ? 'opacity-100' : 'opacity-30'}`}>
        <h2 className="text-sm font-bold text-text-muted mb-3 uppercase tracking-wider">Drawing Status</h2>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-secondary tracking-widest uppercase mb-1">Progress</span>
            <span className="font-mono text-2xl font-light text-text-primary">
              {isStreaming ? `${progress.toFixed(1)}%` : '--'}
            </span>
          </div>
          {/* Progress bar visual */}
          <div className="w-full bg-bg-primary h-3 rounded-full overflow-hidden mt-3 shadow-inner">
            <div 
              className="h-full bg-text-primary transition-all duration-300 rounded-full"
              style={{ width: isStreaming ? `${progress}%` : '0%' }}
            ></div>
          </div>
          <div className="text-xs text-center text-text-muted mt-1">
            {isStreaming ? 'Drawing completed' : 'Ready'}
          </div>
        </div>
      </div>

    </div>
  );
};

export default MachineStatusPanel;
