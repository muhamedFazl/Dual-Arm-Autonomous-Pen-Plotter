import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Send, ChevronRight, Trash2 } from 'lucide-react';

const LOG_COLORS = {
  sent:    'text-sky-400',
  recv:    'text-emerald-400',
  error:   'text-red-400',
  info:    'text-text-muted',
  warning: 'text-yellow-400',
};

const Console = ({ logs, onSend, onClear, serialStatus, playbackState }) => {
  const [input, setInput]         = useState('');
  const [historyIdx, setHistIdx]  = useState(-1);
  const [cmdHistory, setCmdHist]  = useState([]);
  const scrollRef                 = useRef(null);
  const inputRef                  = useRef(null);

  // Auto-scroll to bottom on new log
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;
    onSend(cmd);
    setCmdHist(prev => [cmd, ...prev].slice(0, 100));
    setHistIdx(-1);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistIdx(next);
      setInput(cmdHistory[next] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = historyIdx - 1;
      if (next < 0) { setHistIdx(-1); setInput(''); }
      else { setHistIdx(next); setInput(cmdHistory[next]); }
    }
  };

  const isConnected = serialStatus === 'connected';
  const isBusy = playbackState === 'playing'; // Lockout manual commands during active streaming

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-secondary/40 rounded-2xl border border-white/5 shadow-inner">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-bg-secondary/60 rounded-t-2xl shrink-0">
        <Terminal size={13} className="text-text-muted" />
        <span className="text-xs font-bold text-text-muted uppercase tracking-widest flex-1">Console</span>

        {/* Status pill */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          serialStatus === 'connected'
            ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
            : serialStatus === 'connecting'
            ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10 animate-pulse'
            : 'text-text-muted border-white/10 bg-white/5'
        }`}>
          {serialStatus === 'connected' ? 'LIVE' : serialStatus === 'connecting' ? 'CONNECTING' : 'OFFLINE'}
        </span>

        {/* Clear button */}
        <button
          onClick={onClear}
          className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-text-secondary transition-colors"
          title="Clear console"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Log Output */}
      <div
        ref={scrollRef}
        className="flex-1 p-3 overflow-y-auto font-mono text-[11px] leading-relaxed custom-scrollbar space-y-0.5"
        onClick={() => inputRef.current?.focus()}
      >
        {logs.length === 0 && (
          <div className="text-text-muted italic opacity-40 pt-1 pb-1">
            — No output yet. Connect to a device and send a command. —
          </div>
        )}
        {logs.map((log, i) => (
          <div key={i} className={`flex gap-2 ${LOG_COLORS[log.type] ?? 'text-text-secondary'}`}>
            <span className="text-text-muted opacity-30 select-none shrink-0 w-[52px] text-right">{log.timestamp}</span>
            <span className="break-all whitespace-pre-wrap">
              {log.type === 'sent' && <span className="mr-1 opacity-50">{'>'}</span>}
              {log.message}
            </span>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="shrink-0 px-3 py-2 border-t border-white/5 bg-bg-secondary/30">
        <div className={`flex items-center gap-2 bg-bg-primary rounded-lg px-2.5 py-1.5 border transition-all ${
          isConnected && !isBusy
            ? 'border-white/10 focus-within:border-accent-primary/60 focus-within:ring-1 focus-within:ring-accent-primary/15'
            : 'border-white/5 opacity-50'
        }`}>
          <ChevronRight size={13} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none text-[13px] text-[#ffffff] font-mono focus:outline-none placeholder:text-text-muted/40 focus:ring-0 p-0"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? (isBusy ? 'Console locked while streaming…' : 'Enter G-code or GRBL command…') : 'Not connected'}
            disabled={!isConnected || isBusy}
            spellCheck={false}
            autoComplete="off"
          />
          <button
            type="submit"
            className="p-1 rounded hover:bg-accent-primary/20 text-accent-primary transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={!input.trim() || !isConnected || isBusy}
            title="Send (Enter)"
          >
            <Send size={13} />
          </button>
        </div>
        <p className="text-[9px] text-text-muted/30 mt-1 ml-1">↑ ↓ history · Enter to send</p>
      </form>
    </div>
  );
};

export default Console;
