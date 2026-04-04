import * as THREE from 'three';

export const parseGcode = (gcode) => {
    const lines = gcode.split('\n');
    const segments = [];
    const lineToSegment = new Array(lines.length).fill(null);
    let currentPos = new THREE.Vector3(0, 0, 0);
    let mode = 'G0'; // Default to rapid
    let isRelative = false; // G90 is absolute (default), G91 is relative

    lines.forEach((line, index) => {
        // Basic cleaning
        let cleanLine = line.split(';')[0].trim().toUpperCase(); // Remove comments
        if (cleanLine.length === 0) return;

        // Check for positioning mode
        if (cleanLine.includes('G90')) isRelative = false;
        if (cleanLine.includes('G91')) isRelative = true;

        // Check for motion mode change
        if (cleanLine.startsWith('G0') || cleanLine.startsWith('G00')) mode = 'G0';
        else if (cleanLine.startsWith('G1') || cleanLine.startsWith('G01')) mode = 'G1';

        // We only care about motion commands for visualization for now
        if (cleanLine.startsWith('G0') || cleanLine.startsWith('G1') || cleanLine.startsWith('X') || cleanLine.startsWith('Y') || cleanLine.startsWith('Z')) {
            const nextPos = currentPos.clone();

            const xMatch = cleanLine.match(/X([0-9.-]+)/);
            const yMatch = cleanLine.match(/Y([0-9.-]+)/);
            const zMatch = cleanLine.match(/Z([0-9.-]+)/);

            let moved = false;

            if (xMatch) {
                const val = parseFloat(xMatch[1]);
                nextPos.x = isRelative ? nextPos.x + val : val;
                moved = true;
            }
            if (yMatch) {
                const val = parseFloat(yMatch[1]);
                nextPos.y = isRelative ? nextPos.y + val : val;
                moved = true;
            }
            if (zMatch) {
                const val = parseFloat(zMatch[1]);
                nextPos.z = isRelative ? nextPos.z + val : val;
                moved = true;
            }

            if (moved) {
                const segmentIndex = segments.length;
                segments.push({
                    start: currentPos.clone(),
                    end: nextPos.clone(),
                    type: mode,
                    originalLineIndex: index,
                    raw: line // Keep the original line for streaming
                });
                lineToSegment[index] = segmentIndex;
                currentPos.copy(nextPos);
            }
        }
    });

    return { segments, lineToSegment };
};
