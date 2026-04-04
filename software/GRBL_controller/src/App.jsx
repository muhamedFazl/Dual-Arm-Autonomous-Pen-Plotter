import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Layers, Upload, Play, Square, Pause, Eye, EyeOff, FastForward, Zap, History, Navigation } from 'lucide-react';
import GCodeHistoryModal, { getHistoryCount } from './components/GCodeHistoryModal';
import Visualizer from './components/Visualizer';
import MachineStatusPanel from './components/MachineStatusPanel';
import GCodeEditor from './components/GCodeEditor';
import Console from './components/Console';
import { parseGcode } from './utils/gcodeParser';

function App() {
  const [gcode, setGcode] = useState('');
  const [playbackState, setPlaybackState] = useState('idle'); // 'idle', 'preview', 'playing', 'paused'
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const lastSentLineIndex = useRef(-1); // Hardware-specific "truth" to prevent duplicates
  const [showPreview, setShowPreview] = useState(false);
  const [showG0, setShowG0] = useState(false);
  const [selectedLineIndex, setSelectedLineIndex] = useState(null);

  // History modal state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const bridgeIframeRef = useRef(null);
  const [bridgeReady, setBridgeReady] = useState(false);

  // Mark bridge as ready once the iframe loads
  const handleBridgeLoad = useCallback(() => {
    setBridgeReady(true);
  }, []);

  // Fetch history count from the Caricature app via the iframe bridge
  // once the bridge is ready, and then periodically refresh it.
  useEffect(() => {
    if (!bridgeReady) return;
    // Initial fetch
    getHistoryCount(bridgeIframeRef).then(setHistoryCount);
    // Poll every 5 s so the badge stays up-to-date
    const interval = setInterval(() => {
      getHistoryCount(bridgeIframeRef).then(setHistoryCount);
    }, 5000);
    return () => clearInterval(interval);
  }, [bridgeReady]);

  const handleCloseHistory = () => {
    setIsHistoryOpen(false);
    // Refresh count after closing
    if (bridgeReady) {
      getHistoryCount(bridgeIframeRef).then(setHistoryCount);
    }
  };

  /** Load a gcode string from the history modal into the controller */
  const handleLoadFromHistory = useCallback((gcodeStr) => {
    setGcode(gcodeStr);
    setPlaybackState('preview');
    setCurrentLineIndex(-1);
    lastSentLineIndex.current = -1;
    setSelectedLineIndex(null);
    setMachineStatus(prev => ({ ...prev, x: 0, y: 0, z: 0 })); // Preserve feedrate
    isWaitingForOk.current = false;
    setIsHistoryOpen(false);
  }, []);

  // Serial connection state: 'disconnected' | 'connecting' | 'connected'
  const [serialStatus, setSerialStatus] = useState('disconnected');
  const [serialWarning, setSerialWarning] = useState('');
  const serialPort   = useRef(null); // holds the open SerialPort for G-code streaming
  const serialWriter = useRef(null); // WritableStreamDefaultWriter
  const serialReader = useRef(null); // ReadableStreamDefaultReader (background loop)

  // Console log entries: { type: 'sent'|'recv'|'error'|'info'|'warning', message, timestamp }
  const [consoleLogs, setConsoleLogs] = useState([]);

  const addLog = useCallback((type, message) => {
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    setConsoleLogs(prev => [...prev.slice(-499), { type, message, timestamp }]);
  }, []);

  const [machineStatus, setMachineStatus] = useState({
    x: 0, y: 0, z: 0, feedrate: 100
  });

  const { segments, lineToSegment } = useMemo(() => parseGcode(gcode), [gcode]);

  // Resizing Logic
  const [editorWidth, setEditorWidth] = useState(400); // initial width
  const [isResizingState, setIsResizingState] = useState(false);
  const isResizing = useRef(false);

  const startResizing = (e) => {
    e.preventDefault();
    isResizing.current = true;
    setIsResizingState(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  };

  const handleMouseMove = (e) => {
    if (!isResizing.current) return;
    e.preventDefault();
    const newWidth = document.body.clientWidth - e.clientX;
    setEditorWidth(Math.max(250, Math.min(newWidth, document.body.clientWidth - 400))); // Bounds to prevent taking whole screen
  };

  const stopResizing = () => {
    isResizing.current = false;
    setIsResizingState(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  };

  // ── Web Serial API ──────────────────────────────────────────────────────────

  // Holds the controller to abort the current connection's streams
  const connectionAbortController = useRef(null);
  // Synchronized Streaming state
  const isWaitingForOk = useRef(false);

  /** Persistent background reader – runs for the lifetime of the connection */
  const startReadLoop = useCallback(async (port, signal, onHandshake) => {
    const decoder = new TextDecoderStream();
    // Pipe the port's readable stream to the decoder with an abort signal
    port.readable.pipeTo(decoder.writable, { signal }).catch(() => {});
    const reader = decoder.readable.getReader();
    serialReader.current = reader;

    let lineBuf = '';
    let handshakeDetected = false;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        lineBuf += value;

        // Split on newlines, emit each complete line
        const lines = lineBuf.split('\n');
        lineBuf = lines.pop(); // keep incomplete tail
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Handshake detection within the main loop
          if (!handshakeDetected && trimmed.includes('Grbl')) {
            handshakeDetected = true;
            if (onHandshake) onHandshake(trimmed);
          }

          // Acknowledgment detection
          if (trimmed === 'ok' || trimmed.startsWith('error:')) {
            isWaitingForOk.current = false;
          }

          addLog('recv', trimmed);
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') addLog('error', `Read error: ${err.message}`);
    } finally {
      try { reader.releaseLock(); } catch (_) {}
    }
  }, [addLog]);

  const connectToGRBL = useCallback(async () => {
    if (!('serial' in navigator)) {
      setSerialWarning('Web Serial API is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    let port = null;

    try {
      // Native browser port picker
      port = await navigator.serial.requestPort();
      setSerialStatus('connecting');
      setSerialWarning('');
      addLog('info', 'Port selected — opening at 115200 baud…');

      await port.open({ baudRate: 115200 });

      // Create a fresh abort controller for this connection
      const controller = new AbortController();
      connectionAbortController.current = controller;

      // Create a promise that resolves when the handshake is detected
      let resolveHandshake;
      const handshakeDone = new Promise((res) => {
        resolveHandshake = res;
      });

      // Start persistent background read loop immediately
      startReadLoop(port, controller.signal, (banner) => {
        resolveHandshake(banner);
      });

      // Set up writer for sending commands
      const encoder = new TextEncoderStream();
      encoder.readable.pipeTo(port.writable, { signal: controller.signal }).catch(() => {});
      serialWriter.current = encoder.writable.getWriter();

      // Wait for detection with a timeout
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      );

      const banner = await Promise.race([handshakeDone, timeout]);

      serialPort.current = port;
      setSerialStatus('connected');
      setSerialWarning('');
      addLog('info', `Connected — GRBL detected. Banner: ${banner}`);

    } catch (err) {
      // Cleanup on failure
      if (connectionAbortController.current) {
        connectionAbortController.current.abort();
        connectionAbortController.current = null;
      }
      if (serialWriter.current) {
        try { serialWriter.current.releaseLock(); } catch (_) {}
        serialWriter.current = null;
      }
      if (port) {
        try { await port.close(); } catch (_) {}
      }
      serialPort.current = null;
      setSerialStatus('disconnected');

      if (err.name === 'NotFoundError' || err.name === 'AbortError') {
        setSerialWarning('');
      } else {
        const msg = err.message === 'timeout'
          ? 'Connection timed out: no "Grbl" response within 5 seconds.'
          : `Failed to connect: ${err.message}`;
        setSerialWarning(msg);
        addLog('error', msg);
      }
    }
  }, [addLog, startReadLoop]);

  const disconnectFromGRBL = useCallback(async () => {
    addLog('info', 'Disconnecting…');

    // 1. Abort any active streams/pipes
    if (connectionAbortController.current) {
      connectionAbortController.current.abort();
      connectionAbortController.current = null;
    }

    // 2. Release locks
    if (serialReader.current) {
      try { await serialReader.current.cancel(); } catch (_) {}
      serialReader.current = null;
    }
    if (serialWriter.current) {
      try { serialWriter.current.releaseLock(); } catch (_) {}
      serialWriter.current = null;
    }

    // 3. Small delay to allow stream state to settle before closing
    await new Promise(r => setTimeout(r, 100));

    // 4. Close the actual port
    if (serialPort.current) {
      try { await serialPort.current.close(); } catch (_) {}
      serialPort.current = null;
    }

    setSerialStatus('disconnected');
    setSerialWarning('');
    isWaitingForOk.current = false;
  }, [addLog]);

  /** Send a raw command string to the machine (appends \n unless single char) */
  const sendCommand = useCallback(async (cmd) => {
    if (!serialWriter.current) {
      addLog('error', 'Not connected — cannot send command.');
      return;
    }
    try {
      // 4x Y-axis Scaling Compensation
      const scaledCmd = cmd.replace(/Y\s*([-0-9.]+)/gi, (match, p1) => {
        const val = parseFloat(p1);
        return isNaN(val) ? match : `Y${(val * 4).toFixed(3)}`;
      });

      // Special handling for manual commands to provide feedback
      if (cmd !== '!' && cmd !== '~' && cmd !== '?') {
        addLog('sent', scaledCmd);
      } else {
        // Real-time commands are logged as info to avoid cluttering but still show activity
        addLog('info', `Real-time command: ${cmd}`);
      }

      // GRBL real-time commands are single bytes without newline
      const suffix = (cmd.length === 1 && !/\d/.test(cmd)) ? '' : '\n';
      
      // We don't await the write to prevent the UI from hanging if the writer is busy
      serialWriter.current.write(scaledCmd + suffix).catch(err => {
        addLog('error', `Serial Write Error: ${err.message}`);
      });
    } catch (err) {
      addLog('error', `Send Command failure: ${err.message}`);
    }
  }, [addLog]);

  const handleFeedrateChange = useCallback((newVal) => {
    // If the input is empty (user deleted everything), keep it as an empty string locally
    // but don't send anything to the machine yet.
    if (newVal === '') {
      setMachineStatus(prev => ({ ...prev, feedrate: '' }));
      return;
    }
    const val = parseInt(newVal);
    if (!isNaN(val)) {
      setMachineStatus(prev => ({ ...prev, feedrate: val }));
      if (serialStatus === 'connected') {
        sendCommand(`F${val}`);
      }
    }
  }, [serialStatus, sendCommand]);

  // ────────────────────────────────────────────────────────────────────────────

  // Send next line helper
  const advanceStream = useCallback(async () => {
    // We now stream based on the original lines, not segments
    const lines = gcode.split('\n');
    if (playbackState !== 'playing' || !lines || lines.length === 0) return;

    // 1. Calculate the next line to send (using Ref to avoid React double-render artifacts)
    const next = lastSentLineIndex.current + 1;
    
    // 2. End of file check
    if (next >= lines.length) {
      setPlaybackState('preview');
      isWaitingForOk.current = false;
      addLog('info', 'Streaming complete.');
      return;
    }

    // 3. Update the guard immediately (synchronous)
    lastSentLineIndex.current = next;

    // 4. Update UI State for visualization (can happen later/asynchronously)
    setCurrentLineIndex(next);

    // 5. Get data
    const rawLine = lines[next].trim();
    const segIndex = lineToSegment[next];
    if (segIndex !== null && segments[segIndex]) {
      const seg = segments[segIndex];
      setMachineStatus(prevStatus => ({
        ...prevStatus,
        x: seg.end.x,
        y: seg.end.y,
        z: seg.end.z
      }));
    }

    // 6. IF CONNECTED: Perform side effects outside of any state updaters
    if (serialStatus === 'connected') {
      if (rawLine && !rawLine.startsWith(';')) {
        isWaitingForOk.current = true;
        sendCommand(rawLine);
      } else {
        // Comments/Empty lines don't need acknowledgement, next tick will handle it
      }
    }
  }, [playbackState, gcode, segments, lineToSegment, serialStatus, sendCommand, addLog]);

  // Load G-Code
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setGcode(e.target.result);
        setPlaybackState('preview');
        setCurrentLineIndex(-1); // Start before the first line
        lastSentLineIndex.current = -1;
        setSelectedLineIndex(null);
        setMachineStatus(prev => ({ ...prev, x: 0, y: 0, z: 0 })); // Preserve feedrate
      };
      reader.readAsText(file);
    }
  };

  const handlePlayStop = () => {
    if (playbackState === 'preview') {
      setPlaybackState('playing');
      // If connected, initialize machine state
      if (serialStatus === 'connected') {
        addLog('info', 'Streaming Mode: HARDWARE (Response-based)');
        sendCommand('~'); // Cycle Resume (in case it was in Hold)
        sendCommand(`F${machineStatus.feedrate}`);
      } else {
        addLog('info', 'Streaming Mode: SIMULATION (Fixed 50ms)');
      }
    } else if (playbackState === 'playing' || playbackState === 'paused') {
      setPlaybackState('preview');
      setCurrentLineIndex(-1);
      lastSentLineIndex.current = -1;
      setSelectedLineIndex(null);
      setMachineStatus(prev => ({ ...prev, x: 0, y: 0, z: 0 })); // Keep feedrate
      isWaitingForOk.current = false;

      // If connected, immediately halt the physical machine and clear buffer
      if (serialStatus === 'connected') {
        sendCommand('\x18'); // Soft Reset (Ctrl+X) - Wipes buffer & stops motors
      }
    }
  };

  const handlePauseResume = () => {
    if (playbackState === 'playing') {
      setPlaybackState('paused');
      if (serialStatus === 'connected') sendCommand('!'); // Feed Hold
    } else if (playbackState === 'paused') {
      setPlaybackState('playing');
      if (serialStatus === 'connected') sendCommand('~'); // Cycle Start
    }
  };

  const startFromSelected = () => {
    if (selectedLineIndex !== null && segments[selectedLineIndex]) {
      const seg = segments[selectedLineIndex];
      // Update machine position to the start of the selected line
      setMachineStatus(prev => ({ ...prev, x: seg.start.x, y: seg.start.y, z: seg.start.z }));
      setCurrentLineIndex(seg.originalLineIndex - 1); // Set so the next tick starts at the selected line
      lastSentLineIndex.current = seg.originalLineIndex - 1;
      setPlaybackState('playing');
      setSelectedLineIndex(null); // Unselect after starting
    }
  };

  // Playback Loop
  useEffect(() => {
    let interval;

    if (playbackState === 'playing') {
      if (serialStatus === 'connected') {
        // REAL-TIME STREAMING: Response-based (Ping-Pong)
        // High-speed interval to check if we can advance (once ok received)
        interval = setInterval(() => {
          if (!isWaitingForOk.current && playbackState === 'playing') {
            advanceStream();
          }
        }, 10); 
      } else {
        // SIMULATION MODE: Fixed 50ms interval
        interval = setInterval(() => {
          advanceStream();
        }, 50);
      }
    }

    return () => clearInterval(interval);
  }, [playbackState, serialStatus, advanceStream]);

  const progress = segments.length > 0 ? (currentLineIndex / segments.length) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-bg-primary overflow-hidden">
      {/* Header */}
      <header className="py-4 px-6 bg-bg-secondary flex items-center justify-between shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-4 lg:min-w-[200px]">
          <Layers className="text-accent-secondary" size={28} />
          <h1 className="text-xl font-bold tracking-wider text-text-primary">
            GRBL<span className="font-light opacity-60">CONTROL</span>
          </h1>
        </div>

        {/* Playback Controls & Utility Buttons */}
        <div className="flex flex-1 justify-center items-center gap-6">
          {playbackState !== 'idle' && (
            <div className="flex items-center gap-3 bg-bg-primary px-4 py-2 rounded-xl shadow-inner">
              {/* Play / Stop */}
              <button 
                className={`btn btn-icon ${playbackState === 'preview' ? 'btn-play' : 'btn-stop'}`}
                onClick={handlePlayStop}
                title={playbackState === 'preview' ? 'Play Stream' : 'Stop Stream'}
              >
                {playbackState === 'preview' ? <Play size={22} fill="currentColor" /> : <Square size={22} fill="currentColor" />}
              </button>

              {/* Pause / Resume */}
              <button 
                className={`btn btn-icon ${
                  playbackState === 'preview' ? 'btn-disabled' :
                  playbackState === 'playing' ? 'btn-pause' : 'btn-resume'
                }`}
                disabled={playbackState === 'preview'}
                onClick={handlePauseResume}
                title={playbackState === 'playing' ? 'Pause' : 'Resume'}
              >
                {playbackState === 'playing' ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
              </button>

              <div className="h-8 w-[2px] bg-bg-secondary mx-3 rounded-full"></div>

              {/* Start from Selected */}
              <button 
                className={`btn btn-icon p-3 rounded-xl transition-all flex items-center gap-1 ${
                  selectedLineIndex !== null ? 'text-black bg-accent-secondary' : 'text-text-muted opacity-30 cursor-not-allowed'
                }`}
                disabled={selectedLineIndex === null}
                onClick={startFromSelected}
                title="Start from selected line"
              >
                <FastForward size={22} />
              </button>
              {/* Show Preview Toggle */}
              <button 
                className={`btn btn-icon p-3 rounded-xl transition-all flex items-center gap-2 px-4 ${
                  playbackState === 'preview' ? 'text-text-muted opacity-30 cursor-not-allowed' : 
                  (showPreview ? 'text-black bg-accent-secondary' : 'text-text-secondary hover:text-white')
                }`}
                disabled={playbackState === 'preview'}
                onClick={() => setShowPreview(!showPreview)}
                title="Toggle unexecuted lines preview"
              >
                {showPreview ? <Eye size={20} /> : <EyeOff size={20} />}
                <span className="text-sm font-semibold pr-1">Preview</span>
              </button>

              {/* Show G0 Toggle */}
              <button 
                className={`btn btn-icon p-3 rounded-xl transition-all flex items-center gap-2 px-4 ${
                  playbackState === 'preview' && !gcode ? 'text-text-muted opacity-30 cursor-not-allowed' : 
                  (showG0 ? 'text-black bg-accent-secondary' : 'text-text-secondary hover:text-white')
                }`}
                onClick={() => setShowG0(!showG0)}
                title="Toggle rapid travel (G0) visibility"
              >
                <Navigation size={20} className={showG0 ? "fill-current" : ""} />
                <span className="text-sm font-semibold pr-1">Rapids</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 lg:min-w-[200px] justify-end">
          {/* Serial Connect Button */}
          <button
            id="serial-connect-btn"
            onClick={serialStatus === 'connected' ? disconnectFromGRBL : connectToGRBL}
            disabled={serialStatus === 'connecting'}
            title={
              serialStatus === 'disconnected' ? 'Connect to GRBL via Serial' :
              serialStatus === 'connecting'   ? 'Connecting…' :
                                               'Disconnect from GRBL'
            }
            className={`btn btn-connect ${
              serialStatus === 'connected'
                ? 'btn-connect-connected'
                : serialStatus === 'connecting'
                ? 'btn-connect-connecting'
                : 'btn-connect-idle'
            }`}
          >
            <Zap
              size={16}
              className={serialStatus === 'connected' ? 'fill-current' : ''}
            />
            {serialStatus === 'connected'
              ? 'Connected'
              : serialStatus === 'connecting'
              ? 'Connecting…'
              : 'Connect'}
          </button>

          {/* History Button */}
          <button
            id="history-btn"
            className="btn-history"
            onClick={() => {
              if (bridgeReady) {
                getHistoryCount(bridgeIframeRef).then(setHistoryCount);
              }
              setIsHistoryOpen(true);
            }}
            title="Load from Caricature App history"
          >
            <History size={16} />
            History
            {historyCount > 0 && (
              <span className="btn-history-badge">{historyCount}</span>
            )}
          </button>

          {/* Load File */}
          <label className={`btn btn-load ${gcode ? 'is-loaded' : ''} cursor-pointer`}>
            <Upload size={16} /> {gcode ? 'Loaded' : 'Load G-Code'}
            <input type="file" className="hidden" accept=".gcode,.nc,.txt" onChange={handleFileUpload} />
          </label>
        </div>

        {/* Serial Warning Toast */}
        {serialWarning && (
          <div
            id="serial-warning-toast"
            className="absolute top-[72px] right-6 z-50 max-w-sm bg-red-900/80 border border-red-500/50 text-red-200 text-xs px-4 py-3 rounded-xl shadow-xl backdrop-blur-sm flex items-start gap-2"
          >
            <span className="mt-0.5 shrink-0">⚠</span>
            <span>{serialWarning}</span>
            <button
              className="ml-auto shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              onClick={() => setSerialWarning('')}
            >✕</button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar — Status Panel + Console */}
        <div className="flex flex-col h-full w-[320px] shrink-0 gap-0 overflow-hidden">
          {/* Spindle / Drawing status — only when a file is loaded */}
          {playbackState !== 'idle' && (
            <MachineStatusPanel
              machineStatus={machineStatus}
              playbackState={playbackState}
              progress={progress}
              onFeedrateChange={handleFeedrateChange}
            />
          )}

          {/* Console — always visible, takes remaining height */}
          <div className={`flex-1 overflow-hidden p-6 ${playbackState !== 'idle' ? 'pt-0' : ''}`}>
            <Console
              logs={consoleLogs}
              onSend={sendCommand}
              onClear={() => setConsoleLogs([])}
              serialStatus={serialStatus}
              playbackState={playbackState}
            />
          </div>
        </div>

        {/* Right Content - Visualizer */}
        <div className="flex-1 relative bg-bg-primary min-w-[300px]">
          {gcode ? (
            <Visualizer 
              gcode={gcode}
              segments={segments}
              machinePos={machineStatus} 
              playbackState={playbackState}
              currentLineIndex={currentLineIndex}
              showPreview={showPreview}
              showG0={showG0}
              selectedLineIndex={selectedLineIndex}
              onLineClick={setSelectedLineIndex}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-text-muted tracking-wide gap-4">
              <Layers size={48} className="opacity-20" />
              <p>Load a G-Code file to start the prototype.</p>
            </div>
          )}
        </div>

        {/* Resizer Handle */}
        {gcode && (
           <div 
             className="w-4 bg-transparent hover:bg-bg-tertiary cursor-col-resize transition-colors z-20 shrink-0 select-none flex justify-center items-center group touch-none"
             onMouseDown={startResizing}
             title="Drag to resize panel"
           >
             <div className="w-[4px] h-12 bg-bg-tertiary rounded-full group-hover:bg-text-muted transition-colors"></div>
           </div>
        )}

        {/* Far Right - GCode Editor */}
        {gcode && (
           <div className="h-full shrink-0 flex flex-col bg-bg-panel" style={{ width: editorWidth }}>
              <GCodeEditor 
                 gcode={gcode}
                 segments={segments}
                 lineToSegment={lineToSegment}
                 playbackState={playbackState}
                 currentLineIndex={currentLineIndex}
                 selectedLineIndex={selectedLineIndex}
                 onLineSelect={setSelectedLineIndex}
              />
           </div>
        )}
      </div>

      {/* Resize Overlay */}
      {isResizingState && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none bg-transparent" />
      )}

      {/* G-Code History Modal */}
      <GCodeHistoryModal
        isOpen={isHistoryOpen}
        onClose={handleCloseHistory}
        onLoadGcode={handleLoadFromHistory}
        bridgeRef={bridgeIframeRef}
      />

      {/* Hidden iframe bridge to read Caricature app's localStorage */}
      <iframe
        ref={bridgeIframeRef}
        src="http://localhost:5173/storage-bridge.html"
        onLoad={handleBridgeLoad}
        style={{ display: 'none' }}
        title="Storage Bridge"
      />
    </div>
  );
}

export default App;
