import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { History, X, Download, Trash2 } from 'lucide-react';
import DndUpload from './components/dnd_upload';
import DimensionInput from './components/dimension_input';
import PreviewCanvas from './components/preview_canvas';
import { generateCaricature } from './services/api';
import { toBinary, thinningZhangSuen } from './services/image_processing';
import { traceImageToGcode } from './services/gcode_generator';

function App() {
  const [currentView, setCurrentView] = useState('setup'); // 'setup', 'generating', 'results'
  const [image, setImage] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 100, height: 100 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [gcode, setGcode] = useState(null);
  const [svg, setSvg] = useState(null);
  const [apiImage, setApiImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);

  const [historyItems, setHistoryItems] = useState(() => {
    // Hydrate from localStorage on mount so history survives page reloads
    try {
      const raw = localStorage.getItem('swiftcanvas_gcode_history');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleImageUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
      setGcode(null);
      setApiImage(null);
      setProcessedImage(null);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (imgSrc) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxSize = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        let imageData = ctx.getImageData(0, 0, width, height);

        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const val = avg < 180 ? 0 : 255;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;

          if (data[i + 3] < 50) {
            data[i] = 255; data[i + 1] = 255; data[i + 2] = 255;
          }
          data[i + 3] = 255;
        }

        const thinnedData = thinningZhangSuen(imageData);
        resolve(thinnedData);
      };
      img.src = imgSrc;
    });
  };

  const handleGenerate = async () => {
    if (!image) return;
    setIsProcessing(true);
    setCurrentView('generating');
    setGcode(null);
    setApiImage(null);
    setProcessedImage(null);

    let startImage = image;

    if (import.meta.env.VITE_BANANA_API_KEY) {
      try {
        const res = await fetch(image);
        const blob = await res.blob();
        const caricatureResult = await generateCaricature(blob);

        if (caricatureResult && caricatureResult.output) {
          startImage = caricatureResult.output;
          setApiImage(startImage);
        }
      } catch (apiErr) {
        console.warn("API call failed, falling back to original image:", apiErr);
        alert("API call failed (check console/keys). Using original image for processing.");
      }
    }

    setTimeout(async () => {
      try {
        const thinnedData = await processImage(startImage);

        const canvas = document.createElement('canvas');
        canvas.width = thinnedData.width;
        canvas.height = thinnedData.height;
        canvas.getContext('2d').putImageData(thinnedData, 0, 0);
        setProcessedImage(canvas.toDataURL());

        const result = await traceImageToGcode(thinnedData, {
          targetWidth: dimensions.width,
          targetHeight: dimensions.height
        });

        setGcode(result.gcode);
        setSvg(result.svgString);
        setCurrentView('results');

      } catch (error) {
        console.error("Processing failed:", error);
        alert("Error processing image: " + error.message);
        setCurrentView('setup');
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  const downloadGcode = () => {
    if (!gcode) return;
    const blob = new Blob([gcode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'caricature.gcode';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'caricature.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleNext = () => {
    setCurrentView('setup');
  };

  const handleSaveAndNext = () => {
    const newItem = {
      id: Date.now(),
      image: processedImage || apiImage || image,
      gcode: gcode
    };
    const updated = [newItem, ...historyItems];
    setHistoryItems(updated);
    // Persist to localStorage so the GRBL controller can load it directly
    try {
      localStorage.setItem('swiftcanvas_gcode_history', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save history to localStorage:', e);
    }
    setCurrentView('setup');
  };

  const downloadHistoryGcode = (gcodeData, id) => {
    if (!gcodeData) return;
    const blob = new Blob([gcodeData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `caricature_saved_${id}.gcode`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deleteHistoryItem = (id) => {
    const updated = historyItems.filter((item) => item.id !== id);
    setHistoryItems(updated);
    try {
      localStorage.setItem('swiftcanvas_gcode_history', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not update localStorage:', e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-blue-500/30 relative">
      <div className="w-full px-6 py-8">
        <header className="mb-12 text-center relative max-w-5xl mx-auto">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4 transition-all">
            Caricature to G-code
          </h1>
          <p className="text-gray-400 text-lg">
            Transform your photos into artistic line drawings for plotting.
          </p>
          
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="absolute top-0 right-0 p-3 bg-gray-900 border border-gray-800 rounded-full hover:bg-gray-800 hover:text-blue-400 transition-all shadow-lg flex items-center justify-center gap-2 group"
            title="View Saved History"
          >
            <History className="w-6 h-6 text-gray-300 group-hover:text-blue-400 transition-colors" />
            {historyItems.length > 0 && (
               <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                 {historyItems.length}
               </span>
            )}
          </button>
        </header>

        <main className="w-full">
          {currentView === 'setup' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-fade-in transition-all">
              <div className="space-y-8">
                <section className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 shadow-xl backdrop-blur-sm">
                  <h2 className="text-xl font-semibold mb-4 text-gray-200">1. Upload Image</h2>
                  <DndUpload onImageUpload={handleImageUpload} />
                </section>

                <section className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 shadow-xl backdrop-blur-sm">
                  <h2 className="text-xl font-semibold mb-4 text-gray-200">2. Settings</h2>
                  <DimensionInput
                    width={dimensions.width}
                    height={dimensions.height}
                    onWidthChange={(w) => setDimensions(d => ({ ...d, width: w }))}
                    onHeightChange={(h) => setDimensions(d => ({ ...d, height: h }))}
                  />
                </section>

                <button
                  onClick={handleGenerate}
                  disabled={!image}
                  className={`w-full py-4 rounded-xl text-lg font-bold shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] ${!image
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-blue-900/20'
                  }`}
                >
                  Generate G-code
                </button>
              </div>

              <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 shadow-xl backdrop-blur-sm h-full min-h-[500px]">
                <h2 className="text-xl font-semibold mb-4 text-gray-200">Preview</h2>
                <div className="flex flex-col gap-4">
                  <PreviewCanvas imageSrc={image} />
                </div>
              </div>
            </div>
          )}

          {currentView === 'generating' && (
            <div className="flex flex-col items-center justify-center min-h-[500px] border border-gray-800 bg-gray-900/50 rounded-2xl w-full p-12 transition-all">
               <motion.div
                 animate={{ rotate: 360 }}
                 transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                 className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mb-8"
               />
               <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 animate-pulse text-center">
                 Generating Caricature...
               </h2>
               <p className="mt-4 text-gray-400 text-center">Please wait while the AI works its magic.</p>
            </div>
          )}

          {currentView === 'results' && (
             <div className="space-y-8 w-full animate-fade-in transition-all">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                    
                    <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 shadow-xl backdrop-blur-sm flex flex-col">
                        <h2 className="text-xl font-semibold mb-4 text-gray-200">Final Caricature</h2>
                        <div className="flex-1 min-h-[300px] bg-gray-950 rounded-xl overflow-hidden shadow-inner border border-gray-800 p-4">
                          <img src={processedImage || apiImage || image} alt="Final Preview" className="w-full h-full object-contain bg-white rounded" />
                        </div>
                    </div>

                    <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 shadow-xl backdrop-blur-sm flex flex-col min-h-[400px]">
                        <h2 className="text-xl font-semibold mb-4 text-gray-200">Generated G-code</h2>
                        <textarea
                          readOnly
                          value={gcode || ""}
                          className="flex-1 w-full bg-black/50 text-gray-300 font-mono text-sm p-4 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 mb-6 resize-none custom-scrollbar"
                          style={{ scrollbarWidth: 'thin', scrollbarColor: '#4b5563 transparent' }}
                        />
                        <div className="flex flex-col gap-4 sm:flex-row">
                            <button
                              onClick={downloadGcode}
                              className="flex-1 py-4 px-2 rounded-xl text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg transition-transform transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                              Download G-code
                            </button>
                            <button
                              onClick={handleNext}
                              className="flex-1 py-4 px-2 rounded-xl text-lg font-bold bg-gray-700 hover:bg-gray-600 text-white shadow-lg transition-transform transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                              Next
                            </button>
                            <button
                              onClick={handleSaveAndNext}
                              className="flex-1 py-4 px-2 rounded-xl text-lg font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-transform transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                              Save & Next
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3 stages side-by-side */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 shadow-md">
                      <h3 className="text-gray-400 text-sm font-semibold mb-3 text-center uppercase tracking-wider">1. Original Image</h3>
                      <div className="bg-black/80 rounded-lg h-56 flex items-center justify-center p-2">
                         <img src={image} className="max-w-full max-h-full object-contain rounded" alt="Original" />
                      </div>
                   </div>
                   <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 shadow-md">
                      <h3 className="text-blue-400 text-sm font-semibold mb-3 text-center uppercase tracking-wider">2. AI Caricature</h3>
                      <div className="bg-black/80 rounded-lg h-56 flex items-center justify-center p-2">
                         {apiImage ? (
                           <img src={apiImage} className="max-w-full max-h-full object-contain bg-white rounded" alt="AI Output" />
                         ) : (
                           <span className="text-gray-600 text-xs italic">Skipped or fallback to original</span>
                         )}
                      </div>
                   </div>
                   <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 shadow-md">
                      <h3 className="text-purple-400 text-sm font-semibold mb-3 text-center uppercase tracking-wider">3. Thinned Skeleton</h3>
                      <div className="bg-black/80 rounded-lg h-56 flex items-center justify-center p-2">
                         {processedImage && (
                            <img src={processedImage} className="max-w-full max-h-full object-contain bg-white rounded" alt="Thinned Skeleton" />
                         )}
                      </div>
                   </div>
                </div>
             </div>
          )}

        </main>
      </div>

      {/* History Overlay Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-md overflow-y-auto w-full h-full animate-fade-in flex flex-col">
          <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-900/50 sticky top-0 z-[60]">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Saved</h2>
            <button 
               onClick={() => setIsHistoryOpen(false)} 
               className="p-3 bg-gray-800 border border-gray-700 rounded-full hover:bg-red-500/80 hover:text-white transition-all shadow-lg text-white"
               title="Close History"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
            {historyItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center mt-[10vh]">
                <History className="w-24 h-24 text-gray-800 mb-6" />
                <p className="text-gray-400 text-2xl font-light">No saved caricatures yet.</p>
                <p className="text-gray-600 mt-2">Generate an image and click "Save & Next" to see it here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {historyItems.map((item) => (
                  <div key={item.id} className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 flex flex-col shadow-xl hover:border-gray-600 transition-colors group">
                    <div className="h-48 bg-gray-950 p-4 flex items-center justify-center relative shadow-inner">
                      <img src={item.image} alt="Saved Caricature" className="max-w-full max-h-full object-contain bg-white rounded shadow-sm" />
                    </div>
                    <div className="p-4 bg-gray-900/80 flex flex-col gap-3">
                      <p className="text-xs text-gray-500 text-center font-mono">{new Date(item.id).toLocaleTimeString()}</p>
                      <div className="flex gap-2">
                        <button 
                           onClick={() => downloadHistoryGcode(item.gcode, item.id)}
                           className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] font-semibold"
                        >
                          <span>G-code</span>
                          <Download className="w-5 h-5" />
                        </button>
                        <button 
                           onClick={() => deleteHistoryItem(item.id)}
                           className="py-3 px-4 bg-gray-800 hover:bg-red-500/80 text-gray-400 hover:text-white rounded-xl shadow-lg flex items-center justify-center transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                           title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
