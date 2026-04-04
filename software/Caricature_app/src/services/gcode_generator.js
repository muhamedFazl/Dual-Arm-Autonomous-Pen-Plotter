export const traceImageToGcode = async (imageData, options = {}) => {
    // Use custom skeleton tracing instead of ImageTracer to ensure single-stroke paths
    const paths = traceSkeleton(imageData);

    // Convert paths to G-code
    let gcode = "G21 ; Set units to mm\nG90 ; Absolute positioning\nG0 Z5 ; Lift pen\n";

    const { width: imgWidth, height: imgHeight } = imageData;
    const targetWidth = options.targetWidth || 100;
    // Calculate targetHeight based on aspect ratio if not provided, or respect provided
    const targetHeight = options.targetHeight || (targetWidth * (imgHeight / imgWidth));

    // Scaling factors
    const scaleX = targetWidth / imgWidth;
    const scaleY = targetHeight / imgHeight;

    let svgPathData = "";

    paths.forEach(path => {
        if (path.length < 2) return; // Skip dots

        // Move to start
        const startX = path[0].x * scaleX;
        // Flip Y: G-code (0,0) is bottom-left, Image (0,0) is top-left
        // We usually want the drawing to be upright in G-code space.
        // If we map Image(0,0) to Gcode(0, Height), and Image(0, Height) to Gcode(0, 0)
        const startY = targetHeight - (path[0].y * scaleY);

        gcode += `G0 X${startX.toFixed(3)} Y${startY.toFixed(3)}\n`;
        gcode += `G1 Z0 ; Pen down\n`;

        // SVG parts for visualization
        svgPathData += `M${startX.toFixed(2)},${startY.toFixed(2)} `;

        for (let i = 1; i < path.length; i++) {
            const x = path[i].x * scaleX;
            const y = targetHeight - (path[i].y * scaleY);

            // Optimization: Don't output G1 for every single pixel if they are collinear
            // But for organic scribbles, every pixel might matter.
            // Let's implement a simple simplification: if distance is very small? 
            // No, G1 is fine for now. 
            gcode += `G1 X${x.toFixed(3)} Y${y.toFixed(3)}\n`;
            svgPathData += `L${x.toFixed(2)},${y.toFixed(2)} `;
        }

        gcode += `G0 Z5 ; Pen up\n`;
    });

    gcode += "G0 X0 Y0 ; Return home\nM30 ; End program\n";

    // Create a minimal SVG string for preview if needed
    const svgString = `<svg width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${targetWidth} ${targetHeight}" xmlns="http://www.w3.org/2000/svg">
    <path d="${svgPathData}" stroke="black" fill="none" stroke-width="0.5" />
  </svg>`;

    return { gcode, svgString };
};

/**
 * Traces a skeletonized (1-pixel wide) binary image into paths.
 * Assumes imageData is B&W where Black (0) is foreground.
 */
function traceSkeleton(imageData) {
    const w = imageData.width;
    const h = imageData.height;
    const data = imageData.data;
    const visited = new Uint8Array(w * h);
    const paths = [];

    const isForeground = (x, y) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return false;
        const idx = (y * w + x) * 4;
        // In our pipeline, output of thinning processing has 0,0,0 as foreground
        return data[idx] < 128;
    };

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            if (visited[idx]) continue;
            if (isForeground(x, y)) {
                // Start of a new path
                const path = [];
                let cx = x;
                let cy = y;
                path.push({ x: cx, y: cy });
                visited[idx] = 1;

                // Simple greedy neighbor following
                while (true) {
                    let foundNext = false;
                    // 8-neighbor checking
                    const neighbors = [
                        [1, 0], [1, 1], [0, 1], [-1, 1],
                        [-1, 0], [-1, -1], [0, -1], [1, -1]
                    ];

                    for (let n of neighbors) {
                        const nx = cx + n[0];
                        const ny = cy + n[1];
                        const nIdx = ny * w + nx;

                        if (isForeground(nx, ny) && !visited[nIdx]) {
                            visited[nIdx] = 1;
                            path.push({ x: nx, y: ny });
                            cx = nx;
                            cy = ny;
                            foundNext = true;
                            break;
                        }
                    }

                    if (!foundNext) break;
                }
                if (path.length > 2) { // Filter very short noise
                    paths.push(path);
                }
            }
        }
    }
    return paths;
}
