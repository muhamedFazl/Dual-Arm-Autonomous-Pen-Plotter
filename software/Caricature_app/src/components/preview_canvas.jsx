import React, { useRef, useEffect } from 'react';

const PreviewCanvas = ({ imageSrc, processedImageSrc, gcodePaths }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        // This is where we will eventually draw the paths or processed image
        // For now, simple image display logic
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear

        if (imageSrc) {
            const img = new Image();
            img.src = imageSrc;
            img.onload = () => {
                // Draw original image or processed one
                // Scale to fit canvas
                const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
                const x = (canvas.width / 2) - (img.width / 2) * scale;
                const y = (canvas.height / 2) - (img.height / 2) * scale;
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            }
        }

    }, [imageSrc, processedImageSrc, gcodePaths]);

    return (
        <div className="w-full h-96 bg-gray-900 rounded-xl overflow-hidden shadow-inner border border-gray-800 relative flex items-center justify-center">
            {!imageSrc && <p className="text-gray-600">No image loaded</p>}
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="w-full h-full object-contain"
            />
        </div>
    );
};

export default PreviewCanvas;
