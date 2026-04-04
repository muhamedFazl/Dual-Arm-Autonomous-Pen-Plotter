import React from 'react';
import { Anchor, Activity } from 'lucide-react';

const StatusPanel = ({ status }) => {
    const {
        state = 'Idle',
        mpos = { x: 0, y: 0, z: 0 },
        wpos = { x: 0, y: 0, z: 0 },
        feed = 0,
        spindle = 0
    } = status || {};

    const getStatusColor = (s) => {
        const low = s?.toLowerCase();
        if (low === 'idle') return 'var(--status-idle)';
        if (low === 'run') return 'var(--status-run)';
        if (low === 'hold') return 'var(--status-hold)';
        if (low === 'alarm') return 'var(--status-alarm)';
        return 'var(--text-primary)';
    };

    return (
        <div className="glass-panel p-4 flex flex-col gap-4">
            {/* Header / State */}
            <div className="flex items-center justify-between border-b border-border-color pb-2">
                <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                    <Activity size={14} /> Machine Status
                </h2>
                <div className="px-6 py-1 rounded-full text-xs font-bold bg-bg-primary border border-border-color min-w-[80px] text-center"
                    style={{ color: getStatusColor(state), boxShadow: `0 0 10px ${getStatusColor(state)}33` }}>
                    {state}
                </div>
            </div>

            {/* Coordinates */}
            <div className="flex flex-col gap-2">
                {['X', 'Y', 'Z'].map((axis) => (
                    <div key={axis} className="grid grid-cols-[1fr_30px] items-center gap-3">
                        <div className="bg-bg-primary/50 border border-border-color rounded px-3 py-2 flex flex-col items-end relative overflow-hidden group">
                            {/* Work Pos (Big) */}
                            <span className="font-lcd text-xl text-text-primary tracking-widest z-10 group-hover:text-accent-primary transition-colors">
                                {wpos[axis.toLowerCase()].toFixed(3)}
                            </span>
                            {/* Machine Pos (Small) */}
                            <span className="text-[10px] text-text-muted font-mono z-10">
                                abs: {mpos[axis.toLowerCase()].toFixed(3)}
                            </span>
                            {/* Subtle background bar per axis (optional effect) */}
                            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent-secondary opacity-50"></div>
                        </div>
                        <div className="text-sm font-bold text-text-muted text-center">{axis}</div>
                    </div>
                ))}
            </div>

            {/* Feed / Spindle */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-bg-secondary rounded p-2 text-center border border-border-color">
                    <span className="text-[10px] text-text-muted uppercase block mb-1">Feed Rate</span>
                    <span className="font-mono text-sm text-accent-primary">{feed}</span>
                </div>
                <div className="bg-bg-secondary rounded p-2 text-center border border-border-color">
                    <span className="text-[10px] text-text-muted uppercase block mb-1">Spindle</span>
                    <span className="font-mono text-sm text-accent-secondary">{spindle}</span>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-color">
                <button className="btn text-xs py-2 hover:bg-accent-primary hover:text-white transition-colors">
                    <Anchor size={14} className="mr-1" /> Zero All
                </button>
                <button className="btn text-xs py-2 hover:bg-accent-secondary hover:text-white transition-colors">
                    Home ($H)
                </button>
            </div>
        </div>
    );
};

export default StatusPanel;
