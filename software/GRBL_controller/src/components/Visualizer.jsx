import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, OrthographicCamera, Line } from '@react-three/drei';
import * as THREE from 'three';
import { Box, Monitor, Maximize } from 'lucide-react';

// ── Pre-blended color constants (against #0a0a0a background) ──────────────────
// Blending: result = fg * opacity + bg * (1 - opacity)
const BG_R = 10 / 255, BG_G = 10 / 255, BG_B = 10 / 255;
const blend = (r, g, b, a) => [r * a + BG_R * (1 - a), g * a + BG_G * (1 - a), b * a + BG_B * (1 - a)];

const C_G0_PREVIEW = blend(0x38 / 255, 0xbd / 255, 0xf8 / 255, 0.3);
const C_G1_PREVIEW = [0x02 / 255, 0x84 / 255, 0xc7 / 255];
const C_G0_FUTURE  = blend(0xfc / 255, 0xa5 / 255, 0xa5 / 255, 0.3);
const C_G1_FUTURE  = blend(0xef / 255, 0x44 / 255, 0x44 / 255, 0.6);
const C_HIDDEN     = [BG_R, BG_G, BG_B];

// ── Camera focus helper ──────────────────────────────────────────────────────
const CameraFocus = ({ targetSegment }) => {
    const { controls } = useThree();
    useEffect(() => {
        if (targetSegment && controls) {
            controls.target.set(
                (targetSegment.start.x + targetSegment.end.x) / 2,
                (targetSegment.start.y + targetSegment.end.y) / 2,
                (targetSegment.start.z + targetSegment.end.z) / 2,
            );
            controls.update();
        }
    }, [targetSegment, controls]);
    return null;
};

// ── Click handler (manual raycaster — avoids R3F per-frame raycasting) ───────
const ToolpathClickHandler = ({ lineRef, segments, onLineClick }) => {
    const { camera, gl, raycaster } = useThree();

    useEffect(() => {
        if (!onLineClick) return;
        const canvas = gl.domElement;
        let downX = 0, downY = 0;

        const onDown = (e) => { downX = e.clientX; downY = e.clientY; };
        const onUp = (e) => {
            // Only fire on actual clicks, not drags (orbit)
            if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) return;
            if (!lineRef.current) return;

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const ndc = new THREE.Vector2(
                (mouseX / rect.width) * 2 - 1,
                -(mouseY / rect.height) * 2 + 1,
            );
            const rc = new THREE.Raycaster();
            rc.params.Line.threshold = 2;
            rc.setFromCamera(ndc, camera);
            const hits = rc.intersectObject(lineRef.current, false);
            if (hits.length === 0) return;

            // Pick the hit whose intersection point is closest to the
            // mouse in screen-space (most visually accurate).
            let bestIdx = -1;
            let bestDist = Infinity;
            for (const hit of hits) {
                if (hit.index === undefined) continue;
                const p = hit.point.clone().project(camera);
                const sx = (p.x + 1) / 2 * rect.width;
                const sy = (-p.y + 1) / 2 * rect.height;
                const d = (sx - mouseX) ** 2 + (sy - mouseY) ** 2;
                if (d < bestDist) {
                    bestDist = d;
                    bestIdx = Math.floor(hit.index / 2);
                }
            }
            if (bestIdx >= 0) onLineClick(bestIdx);
        };

        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('pointerup', onUp);
        return () => {
            canvas.removeEventListener('pointerdown', onDown);
            canvas.removeEventListener('pointerup', onUp);
        };
    }, [camera, gl, lineRef, onLineClick, raycaster]);

    return null;
};

// ── Optimised Toolpath ───────────────────────────────────────────────────────
const Toolpath = React.memo(({ segments, playbackState, currentLineIndex, showPreview, showG0, selectedLineIndex, onLineClick }) => {
    const lineRef = useRef();
    const geoRef = useRef();

    // 1. Static position buffer — rebuilt only when gcode changes
    const positions = useMemo(() => {
        const n = segments.length;
        const arr = new Float32Array(n * 6);
        for (let i = 0; i < n; i++) {
            const o = i * 6, s = segments[i];
            arr[o] = s.start.x; arr[o + 1] = s.start.y; arr[o + 2] = s.start.z;
            arr[o + 3] = s.end.x; arr[o + 4] = s.end.y; arr[o + 5] = s.end.z;
        }
        return arr;
    }, [segments]);

    // Cache segment types as compact Uint8Array (0 = G0, 1 = G1)
    const segTypes = useMemo(() => {
        const t = new Uint8Array(segments.length);
        for (let i = 0; i < segments.length; i++) t[i] = segments[i].type === 'G0' ? 0 : 1;
        return t;
    }, [segments]);

    // Allocate colour buffer (resized only if segment count changes)
    const colorsArr = useRef(new Float32Array(0));
    if (colorsArr.current.length !== segments.length * 6) {
        colorsArr.current = new Float32Array(segments.length * 6);
    }

    // 2. Attach buffers to geometry when positions change
    useEffect(() => {
        const geo = geoRef.current;
        if (!geo) return;
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colorsArr.current, 3));
        geo.computeBoundingSphere();
    }, [positions]);

    // 3. Update vertex colours in-place whenever visual state changes
    useEffect(() => {
        const geo = geoRef.current;
        if (!geo) return;
        const attr = geo.getAttribute('color');
        if (!attr) return;

        const colors = attr.array;
        const types = segTypes;
        const n = segments.length;
        const isPlayback = playbackState === 'playing' || playbackState === 'paused';

        for (let i = 0; i < n; i++) {
            const isG0 = types[i] === 0;
            let c;

            if (i === selectedLineIndex || (isPlayback && i === currentLineIndex)) {
                c = C_HIDDEN; // rendered by fat-line overlay instead
            } else if (!isPlayback) {
                if (isG0 && !showG0) {
                    c = C_HIDDEN;
                } else {
                    c = isG0 ? C_G0_PREVIEW : C_G1_PREVIEW;
                }
            } else if (i < currentLineIndex) {
                if (isG0 && !showG0) {
                    c = C_HIDDEN;
                } else {
                    c = isG0 ? C_G0_PREVIEW : C_G1_PREVIEW; 
                }
            } else {
                if (showPreview) {
                    if (isG0 && !showG0) {
                        c = C_HIDDEN;
                    } else {
                        c = isG0 ? C_G0_FUTURE : C_G1_FUTURE;
                    }
                } else {
                    c = C_HIDDEN;
                }
            }

            const o = i * 6;
            colors[o] = colors[o + 3] = c[0];
            colors[o + 1] = colors[o + 4] = c[1];
            colors[o + 2] = colors[o + 5] = c[2];
        }
        attr.needsUpdate = true;
    }, [segments, segTypes, playbackState, currentLineIndex, showPreview, showG0, selectedLineIndex]);

    // 4. Highlight overlays (max 2 drei Lines — negligible cost)
    const currentPts = useMemo(() => {
        if ((playbackState === 'playing' || playbackState === 'paused') && segments[currentLineIndex]) {
            const s = segments[currentLineIndex];
            return [[s.start.x, s.start.y, s.start.z], [s.end.x, s.end.y, s.end.z]];
        }
        return null;
    }, [segments, currentLineIndex, playbackState]);

    const selectedPts = useMemo(() => {
        if (selectedLineIndex !== null && segments[selectedLineIndex]) {
            const s = segments[selectedLineIndex];
            return [[s.start.x, s.start.y, s.start.z], [s.end.x, s.end.y, s.end.z]];
        }
        return null;
    }, [segments, selectedLineIndex]);

    return (
        <group>
            {/* Single draw-call for the entire toolpath */}
            <lineSegments ref={lineRef}>
                <bufferGeometry ref={geoRef} />
                <lineBasicMaterial vertexColors />
            </lineSegments>

            {/* Click detection via manual raycaster (no per-frame overhead) */}
            <ToolpathClickHandler lineRef={lineRef} segments={segments} onLineClick={onLineClick} />

            {/* Fat-line highlights — at most 2 objects */}
            {currentPts && (
                <Line key="hl-current" points={currentPts} color="#fef08a" lineWidth={5} />
            )}
            {selectedPts && (
                <Line key="hl-selected" points={selectedPts} color="#22c55e" lineWidth={6} />
            )}
        </group>
    );
});

// ── Static scene furniture ──────────────────────────────────────────────────
const MachineBed = React.memo(() => (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[100, -100, -0.1]}>
        <Grid
            infiniteGrid
            fadeDistance={400}
            sectionColor="#0ea5e9"
            cellColor="#334155"
            sectionSize={10}
            cellSize={10}
        />
    </group>
));

const ToolHead = React.memo(({ position }) => (
    <group position={[position.x, position.y, position.z]}>
        <mesh>
            <sphereGeometry args={[2, 16, 16]} />
            <meshBasicMaterial color="#f59e0b" />
        </mesh>
        <pointLight distance={30} intensity={2} color="#f59e0b" />
    </group>
));

// ── Main Visualizer ──────────────────────────────────────────────────────────
const Visualizer = ({ gcode, segments, machinePos, playbackState, currentLineIndex, showPreview, showG0, selectedLineIndex, onLineClick }) => {
    const [viewMode, setViewMode] = useState('3D');

    const targetSegment = useMemo(() => {
        if (currentLineIndex !== null && segments?.[currentLineIndex]) return segments[currentLineIndex];
        return null;
    }, [currentLineIndex, segments]);

    const toggleView = () => setViewMode(prev => prev === '3D' ? '2D' : '3D');

    return (
        <div className="w-full h-full relative group">
            {/* Floating Controls */}
            <div className="absolute z-10 flex gap-2" style={{ bottom: '1rem', left: '1rem' }}>
                <button className="btn btn-icon bg-bg-panel hover:bg-bg-panel-hover text-text-primary backdrop-blur-md border border-border-color shadow-lg" onClick={toggleView} title="Toggle View Mode">
                    {viewMode === '3D' ? <Box size={18} /> : <Monitor size={18} />}
                </button>
                <button className="btn btn-icon bg-bg-panel hover:bg-bg-panel-hover text-text-primary backdrop-blur-md border border-border-color shadow-lg" title="Reset View">
                    <Maximize size={18} />
                </button>
            </div>

            {/* Viewport badge */}
            <div className="absolute top-4 right-4 z-10 pointer-events-none">
                <div className="bg-bg-panel/50 backdrop-blur-sm border border-border-color rounded px-2 py-1 text-[10px] font-mono text-text-muted">
                    {viewMode} Viewport
                </div>
            </div>

            <Canvas frameloop="demand" performance={{ min: 0.5 }}>
                <color attach="background" args={['#0a0a0a']} />
                <fog attach="fog" args={['#0a0a0a', 500, 5000]} />

                <ambientLight intensity={0.4} />
                <pointLight position={[100, 100, 300]} intensity={1} color="#0ea5e9" />
                <pointLight position={[-100, -100, 300]} intensity={0.5} color="#6366f1" />

                {viewMode === '3D' ? (
                    <PerspectiveCamera makeDefault position={[200, -300, 300]} up={[0, 0, 1]} fov={45} far={8000} />
                ) : (
                    <OrthographicCamera makeDefault position={[100, -100, 500]} zoom={2} up={[0, 1, 0]} far={8000} />
                )}

                <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
                <CameraFocus targetSegment={targetSegment} />

                <group>
                    <axesHelper args={[30]} />
                    <MachineBed />
                    {segments && (
                        <Toolpath
                            segments={segments}
                            playbackState={playbackState}
                            currentLineIndex={currentLineIndex}
                            showPreview={showPreview}
                            showG0={showG0}
                            selectedLineIndex={selectedLineIndex}
                            onLineClick={onLineClick}
                        />
                    )}
                    {machinePos && playbackState !== 'idle' && <ToolHead position={machinePos} />}
                </group>

                {/* Invalidate on state changes so demand-mode redraws */}
                <Invalidate deps={[playbackState, currentLineIndex, showPreview, showG0, machinePos, viewMode]} />
            </Canvas>
        </div>
    );
};

/** Tiny helper that calls invalidate() whenever deps change, so `frameloop="demand"` redraws. */
const Invalidate = ({ deps }) => {
    const { invalidate } = useThree();
    useEffect(() => { invalidate(); }, deps);          // eslint-disable-line react-hooks/exhaustive-deps
    // Also invalidate on orbit (OrbitControls fires 'change')
    const { controls } = useThree();
    useEffect(() => {
        if (!controls) return;
        const handler = () => invalidate();
        controls.addEventListener('change', handler);
        return () => controls.removeEventListener('change', handler);
    }, [controls, invalidate]);
    return null;
};

export default Visualizer;
