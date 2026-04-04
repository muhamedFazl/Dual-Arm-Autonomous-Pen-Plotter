import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Upload, Camera, X, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

const DndUpload = ({ onImageUpload }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [cameraError, setCameraError] = useState(null);
    const [cameraStream, setCameraStream] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            if (files[0].type.startsWith('image/')) {
                onImageUpload(files[0]);
            } else {
                alert("Please upload an image file.");
            }
        }
    }, [onImageUpload]);

    const handleFileInput = useCallback((e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            onImageUpload(files[0]);
        }
    }, [onImageUpload]);

    // --- Camera Logic ---

    const startCamera = async () => {
        setCameraError(null);
        setCapturedImage(null);
        setIsCameraOpen(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
            setCameraStream(stream);
        } catch (err) {
            console.error("Camera access error:", err);
            setCameraError("Could not access camera. Please allow camera permissions.");
        }
    };

    // Ref callback: attach stream the instant the <video> DOM node mounts
    const videoRefCallback = useCallback((node) => {
        videoRef.current = node;
        if (node && cameraStream) {
            node.srcObject = cameraStream;
        }
    }, [cameraStream]);

    // Also re-attach when stream arrives after the video is already mounted
    useEffect(() => {
        if (videoRef.current && cameraStream && !capturedImage) {
            videoRef.current.srcObject = cameraStream;
        }
    }, [cameraStream, capturedImage]);

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach((track) => track.stop());
            setCameraStream(null);
        }
        setIsCameraOpen(false);
        setCapturedImage(null);
        setCameraError(null);
    };

    const capturePhoto = () => {
        const video = videoRef.current;
        if (!video) return;

        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        setCapturedImage(dataUrl);
    };

    const retakePhoto = () => {
        setCapturedImage(null);
    };

    const usePhoto = () => {
        if (!capturedImage) return;
        // Convert data URL to a File so App.jsx's handleImageUpload works as-is
        fetch(capturedImage)
            .then((res) => res.blob())
            .then((blob) => {
                const file = new File([blob], `camera_${Date.now()}.png`, { type: 'image/png' });
                onImageUpload(file);
                stopCamera();
            });
    };

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Two input modes side by side */}
            <div className={`flex gap-4 ${isCameraOpen ? 'min-h-[360px]' : 'min-h-[180px]'} transition-all`}>
                {/* File Upload Zone */}
                <motion.div
                    className={`relative flex-1 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50/10' : 'border-gray-600 hover:border-gray-500'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-upload').click()}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                >
                    <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileInput}
                    />
                    <div className="bg-gray-800 p-3 rounded-full mb-3">
                        <Upload className="w-7 h-7 text-blue-400" />
                    </div>
                    <p className="text-base font-medium text-white mb-1">
                        {isDragging ? "Drop here" : "Upload"}
                    </p>
                    <p className="text-xs text-gray-400 text-center">
                        Drag & drop or click
                    </p>
                </motion.div>

                {/* Camera Button */}
                <motion.div
                    className="border-2 border-dashed border-gray-600 hover:border-purple-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors"
                    onClick={(e) => { e.stopPropagation(); startCamera(); }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    style={{ minWidth: '120px' }}
                >
                    <div className="bg-gray-800 p-3 rounded-full mb-3">
                        <Camera className="w-7 h-7 text-purple-400" />
                    </div>
                    <p className="text-base font-medium text-white mb-1">Camera</p>
                    <p className="text-xs text-gray-400 text-center">Take a photo</p>
                </motion.div>
            </div>

            {/* Hidden canvas for capturing frames */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Camera Overlay Modal */}
            {isCameraOpen && (
                <div className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in">
                    {/* Top bar */}
                    <div className="w-full max-w-2xl flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-white">Take a Photo</h3>
                        <button
                            onClick={stopCamera}
                            className="p-2 bg-gray-800 border border-gray-700 rounded-full hover:bg-red-500/80 hover:text-white transition-all text-white"
                            title="Close Camera"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Camera feed or captured preview */}
                    <div className="w-full max-w-2xl bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl aspect-video flex items-center justify-center relative">
                        {cameraError ? (
                            <p className="text-red-400 text-center px-6">{cameraError}</p>
                        ) : !capturedImage ? (
                            <video
                                ref={videoRefCallback}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-contain bg-black"
                            />
                        ) : (
                            <img src={capturedImage} alt="Captured" className="w-full h-full object-contain bg-black" />
                        )}
                    </div>

                    {/* Controls */}
                    <div className="flex gap-4 mt-6">
                        {!capturedImage && !cameraError && (
                            <button
                                onClick={capturePhoto}
                                className="py-3 px-8 rounded-full text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg transition-transform transform hover:scale-[1.03] active:scale-[0.97]"
                            >
                                Capture
                            </button>
                        )}
                        {capturedImage && (
                            <>
                                <button
                                    onClick={retakePhoto}
                                    className="py-3 px-6 rounded-full text-lg font-bold bg-gray-700 hover:bg-gray-600 text-white shadow-lg transition-transform transform hover:scale-[1.03] active:scale-[0.97] flex items-center gap-2"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                    Retake
                                </button>
                                <button
                                    onClick={usePhoto}
                                    className="py-3 px-8 rounded-full text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg transition-transform transform hover:scale-[1.03] active:scale-[0.97]"
                                >
                                    Use Photo
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DndUpload;
