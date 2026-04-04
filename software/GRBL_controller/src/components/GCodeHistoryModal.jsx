import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, History, Download } from 'lucide-react';

// The Caricature app serves a tiny bridge page that lets us read its localStorage
// via postMessage across origins. Default Vite port for the first app is 5173.
const CARICATURE_ORIGIN = 'http://localhost:5173';
const BRIDGE_URL = `${CARICATURE_ORIGIN}/storage-bridge.html`;

/**
 * Request the history array from the Caricature app's localStorage
 * via the iframe bridge. Returns a Promise that resolves to the array.
 */
function requestHistoryFromBridge(iframeRef) {
  return new Promise((resolve) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) {
      resolve([]);
      return;
    }

    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve([]);
    }, 3000);

    function handler(e) {
      if (e.origin !== CARICATURE_ORIGIN) return;
      if (e.data && e.data.type === 'HISTORY_DATA') {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        try {
          resolve(e.data.data ? JSON.parse(e.data.data) : []);
        } catch {
          resolve([]);
        }
      }
    }

    window.addEventListener('message', handler);
    iframeRef.current.contentWindow.postMessage({ type: 'GET_HISTORY' }, CARICATURE_ORIGIN);
  });
}

/** Returns count from bridge (async) — used for the badge */
export async function getHistoryCount(iframeRef) {
  const items = await requestHistoryFromBridge(iframeRef);
  return items.length;
}

export default function GCodeHistoryModal({ isOpen, onClose, onLoadGcode, bridgeRef }) {
  const [historyItems, setHistoryItems] = useState([]);
  const [loadedId, setLoadedId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Refresh history every time the modal opens
  useEffect(() => {
    if (isOpen && bridgeRef) {
      setLoadedId(null);
      setLoading(true);
      requestHistoryFromBridge(bridgeRef).then((items) => {
        setHistoryItems(items);
        setLoading(false);
      });
    }
  }, [isOpen, bridgeRef]);

  if (!isOpen) return null;

  const handleLoad = (item) => {
    onLoadGcode(item.gcode);
    setLoadedId(item.id);
  };

  return (
    <div className="grbl-history-overlay">
      {/* Header */}
      <div className="grbl-history-header">
        <div className="grbl-history-title">
          <History size={22} />
          <span>Saved G-Code History</span>
        </div>
        <button className="grbl-history-close" onClick={onClose} title="Close">
          <X size={20} />
        </button>
      </div>

      {/* Body */}
      <div className="grbl-history-body">
        {loading ? (
          <div className="grbl-history-empty">
            <div className="grbl-history-spinner" />
            <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.9rem' }}>
              Loading history…
            </p>
          </div>
        ) : historyItems.length === 0 ? (
          <div className="grbl-history-empty">
            <History size={64} style={{ opacity: 0.1 }} />
            <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '1rem' }}>
              No saved G-code yet.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.4rem', opacity: 0.6 }}>
              Generate a caricature and click "Save &amp; Next" in the Caricature App.
            </p>
          </div>
        ) : (
          <div className="grbl-history-grid">
            {historyItems.map((item) => {
              const isLoaded = loadedId === item.id;
              return (
                <div key={item.id} className="grbl-history-card">
                  {/* Image */}
                  <div className="grbl-history-card-img">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt="Saved Caricature"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          background: '#fff',
                          borderRadius: '6px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        }}
                      />
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No preview</span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="grbl-history-card-footer">
                    <p className="grbl-history-card-time">
                      {new Date(item.id).toLocaleString()}
                    </p>
                    <button
                      className={`grbl-history-load-btn ${isLoaded ? 'is-loaded' : ''}`}
                      onClick={() => handleLoad(item)}
                      title={isLoaded ? 'Already loaded' : 'Load into GRBL controller'}
                    >
                      {isLoaded ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Loaded
                        </>
                      ) : (
                        <>
                          <Download size={15} />
                          Load
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
