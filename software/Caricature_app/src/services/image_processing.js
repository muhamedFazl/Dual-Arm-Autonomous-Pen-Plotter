/**
 * Converts an image (HTMLImageElement) to a binary (B&W) canvas data.
 * @param {HTMLImageElement} img 
 * @param {number} threshold 0-255
 * @returns {ImageData}
 */
export const toBinary = (img, threshold = 128) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const val = avg < threshold ? 0 : 255;
        data[i] = val; // R
        data[i + 1] = val; // G
        data[i + 2] = val; // B
        // Alpha remains unchanged or set to 255
        // data[i + 3] = 255; 
    }
    return imageData;
};

/**
 * Zhang-Suen thinning algorithm to skeletonize binary image data.
 * Assumes black pixels (0) are background and white (255) are foreground? 
 * Usually thinning works on foreground=1, background=0.
 * Let's assume input is B&W where lines are DARK (0) and background is WHITE (255) for standard drawing.
 * But thinning algorithms usually work on White foreground on Black background.
 * So we will invert if necessary: treat DARK pixels as 1 (foreground) and LIGHT as 0 (background).
 * 
 * @param {ImageData} imageData 
 * @returns {ImageData} Thinned image data
 */
export const thinningZhangSuen = (imageData) => {
    const w = imageData.width;
    const h = imageData.height;
    const data = imageData.data;
    // Create a binary grid: 1 for foreground (dark pixels), 0 for background
    const grid = new Int8Array(w * h);

    for (let i = 0; i < data.length; i += 4) {
        // If pixel is dark (< 128), it's foreground (1)
        grid[i / 4] = data[i] < 128 ? 1 : 0;
    }

    let changing = true;
    while (changing) {
        changing = false;
        const toClear = [];

        // Step 1
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const i = y * w + x;
                if (!grid[i]) continue;

                const p2 = grid[i - w];
                const p3 = grid[i - w + 1];
                const p4 = grid[i + 1];
                const p5 = grid[i + w + 1];
                const p6 = grid[i + w];
                const p7 = grid[i + w - 1];
                const p8 = grid[i - 1];
                const p9 = grid[i - w - 1];

                const A = (p2 === 0 && p3 === 1) + (p3 === 0 && p4 === 1) +
                    (p4 === 0 && p5 === 1) + (p5 === 0 && p6 === 1) +
                    (p6 === 0 && p7 === 1) + (p7 === 0 && p8 === 1) +
                    (p8 === 0 && p9 === 1) + (p9 === 0 && p2 === 1);

                const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;

                if (A === 1 && (B >= 2 && B <= 6) &&
                    (p2 * p4 * p6 === 0) && (p4 * p6 * p8 === 0)) {
                    toClear.push(i);
                }
            }
        }

        if (toClear.length > 0) {
            changing = true;
            for (const i of toClear) grid[i] = 0;
            toClear.length = 0;
        }

        // Step 2
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const i = y * w + x;
                if (!grid[i]) continue;

                const p2 = grid[i - w];
                const p3 = grid[i - w + 1];
                const p4 = grid[i + 1];
                const p5 = grid[i + w + 1];
                const p6 = grid[i + w];
                const p7 = grid[i + w - 1];
                const p8 = grid[i - 1];
                const p9 = grid[i - w - 1];

                const A = (p2 === 0 && p3 === 1) + (p3 === 0 && p4 === 1) +
                    (p4 === 0 && p5 === 1) + (p5 === 0 && p6 === 1) +
                    (p6 === 0 && p7 === 1) + (p7 === 0 && p8 === 1) +
                    (p8 === 0 && p9 === 1) + (p9 === 0 && p2 === 1);

                const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;

                if (A === 1 && (B >= 2 && B <= 6) &&
                    (p2 * p4 * p8 === 0) && (p2 * p6 * p8 === 0)) {
                    toClear.push(i);
                }
            }
        }

        if (toClear.length > 0) {
            changing = true;
            for (const i of toClear) grid[i] = 0;
        }
    }

    // Write back to ImageData
    for (let i = 0; i < grid.length; i++) {
        const val = grid[i] === 1 ? 0 : 255; // 0 (Black) for foreground, 255 for background
        data[i * 4] = val;
        data[i * 4 + 1] = val;
        data[i * 4 + 2] = val;
        // Alpha unchanged
    }

    return imageData;
};
