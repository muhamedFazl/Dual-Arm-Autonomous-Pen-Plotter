import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Move, Zap } from 'lucide-react';

const JogControls = ({ onJog }) => {
    const [stepSize, setStepSize] = useState(10);

    const handleJog = (axis, dir) => {
        onJog(axis, dir * stepSize, 1000); // Feed rate fixed for now
    };

    return (
        <div className="glass-panel p-4 flex flex-col gap-4 h-full justify-center">
            <div className="flex items-center justify-between pb-2 border-b border-border-color shrink-0">
                <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                    <Move size={14} /> Jog Control
                </h2>
                <Zap size={14} className="text-accent-warning" />
            </div>

            {/* Step Selection - Bigger Buttons for easier touch */}
            <div className="flex bg-bg-secondary rounded-lg p-1.5 border border-border-color gap-1 shrink-0">
                {[0.1, 1, 10, 100].map(val => (
                    <button
                        key={val}
                        onClick={() => setStepSize(val)}
                        className={`flex-1 text-sm py-4 rounded-md transition-all font-mono font-bold ${stepSize === val ? 'bg-accent-primary text-white shadow-md' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'}`}
                    >
                        {val}
                    </button>
                ))}
            </div>

            <div className="flex gap-8 items-center justify-center flex-1">
                {/* D-Pad / WASD Layout - 1.5x Bigger (240px) */}
                <div className="w-[240px] h-[240px] relative flex items-center justify-center bg-bg-secondary/30 rounded-full border border-border-color/50 shadow-inner">

                    {/* Cross Base - Scaled Up */}
                    <div className="absolute w-[210px] h-[210px]">
                        <div className="grid grid-cols-3 grid-rows-3 gap-2 h-full w-full p-3">
                            {/* Top Center - Y+ */}
                            <div className="col-start-2 row-start-1">
                                <button
                                    className="w-full h-full bg-bg-tertiary rounded-t-xl border border-border-color shadow-[0_6px_0_0_#1e293b] active:shadow-none active:translate-y-[6px] transition-all flex items-center justify-center hover:bg-accent-primary hover:text-white"
                                    onClick={() => handleJog('Y', 1)}
                                >
                                    <ArrowUp size={32} strokeWidth={3} />
                                </button>
                            </div>

                            {/* Middle Left - X- */}
                            <div className="col-start-1 row-start-2">
                                <button
                                    className="w-full h-full bg-bg-tertiary rounded-l-xl border border-border-color shadow-[0_6px_0_0_#1e293b] active:shadow-none active:translate-y-[6px] transition-all flex items-center justify-center hover:bg-accent-primary hover:text-white"
                                    onClick={() => handleJog('X', -1)}
                                >
                                    <ArrowLeft size={32} strokeWidth={3} />
                                </button>
                            </div>

                            {/* Center - Decor */}
                            <div className="col-start-2 row-start-2 bg-bg-secondary rounded flex items-center justify-center">
                                <div className="w-6 h-6 rounded-full bg-accent-glow animate-pulse"></div>
                            </div>

                            {/* Middle Right - X+ */}
                            <div className="col-start-3 row-start-2">
                                <button
                                    className="w-full h-full bg-bg-tertiary rounded-r-xl border border-border-color shadow-[0_6px_0_0_#1e293b] active:shadow-none active:translate-y-[6px] transition-all flex items-center justify-center hover:bg-accent-primary hover:text-white"
                                    onClick={() => handleJog('X', 1)}
                                >
                                    <ArrowRight size={32} strokeWidth={3} />
                                </button>
                            </div>

                            {/* Bottom Center - Y- */}
                            <div className="col-start-2 row-start-3">
                                <button
                                    className="w-full h-full bg-bg-tertiary rounded-b-xl border border-border-color shadow-[0_6px_0_0_#1e293b] active:shadow-none active:translate-y-[6px] transition-all flex items-center justify-center hover:bg-accent-primary hover:text-white"
                                    onClick={() => handleJog('Y', -1)}
                                >
                                    <ArrowDown size={32} strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Z Axis Header - 4x Taller (approx 400px now 4/5 of 500) */}
                <div className="w-20 h-[400px] bg-bg-secondary rounded-full border border-border-color flex flex-col items-center justify-between p-3 shadow-inner">
                    <button
                        className="w-14 h-14 rounded-full bg-bg-tertiary hover:bg-accent-primary hover:text-white flex items-center justify-center transition-colors shadow-lg active:scale-95"
                        onClick={() => handleJog('Z', 1)}
                    >
                        <ArrowUp size={24} />
                    </button>
                    <div className="flex-1 w-[2px] bg-border-color/50 my-2"></div>
                    <span className="text-sm font-bold text-text-muted py-2">Z</span>
                    <div className="flex-1 w-[2px] bg-border-color/50 my-2"></div>
                    <button
                        className="w-14 h-14 rounded-full bg-bg-tertiary hover:bg-accent-primary hover:text-white flex items-center justify-center transition-colors shadow-lg active:scale-95"
                        onClick={() => handleJog('Z', -1)}
                    >
                        <ArrowDown size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JogControls;
