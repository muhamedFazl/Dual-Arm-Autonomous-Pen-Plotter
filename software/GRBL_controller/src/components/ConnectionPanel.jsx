import React, { useState } from 'react';
import { Plug, PlugZap, RefreshCw } from 'lucide-react';

const ConnectionPanel = ({ onConnect, isConnected, portName }) => {
  const [baudRate, setBaudRate] = useState(115200);

  const handleConnect = () => {
    onConnect(baudRate);
  };

  return (
    <div className="glass-panel p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          {isConnected ? <PlugZap size={20} className="text-accent-success" /> : <Plug size={20} />}
          Connection
        </h3>
        {isConnected && <span className="text-xs text-accent-success bg-green-900/30 px-2 py-1 rounded">Active</span>}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <select
            className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-accent-primary"
            value={baudRate}
            onChange={(e) => setBaudRate(Number(e.target.value))}
            disabled={isConnected}
          >
            <option value={9600}>9600</option>
            <option value={115200}>115200</option>
            <option value={250000}>250000</option>
          </select>
        </div>

        <button
          className={`btn w-full ${isConnected ? 'btn-danger' : 'btn-primary'}`}
          onClick={handleConnect}
        >
          {isConnected ? 'Disconnect' : 'Connect to Machine'}
        </button>

        {isConnected && portName && (
          <div className="text-xs text-text-muted mt-1 text-center font-mono">
            {portName}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionPanel;
