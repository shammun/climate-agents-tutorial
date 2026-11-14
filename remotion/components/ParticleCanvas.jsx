import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

export const ParticleCanvas = () => {
  const canvasRef = useRef(null);
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const state = useMemo(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 8;

    const count = 150;
    const positions = new Float32Array(count * 3);
    const velocities = [];
    // Use a seeded-ish deterministic layout so every frame is consistent
    for (let i = 0; i < count; i++) {
      const seed = i * 2.399963;
      positions[i * 3]     = ((Math.sin(seed * 1.1) * 0.5 + 0.5) - 0.5) * 16;
      positions[i * 3 + 1] = ((Math.sin(seed * 2.3) * 0.5 + 0.5) - 0.5) * 10;
      positions[i * 3 + 2] = ((Math.sin(seed * 3.7) * 0.5 + 0.5) - 0.5) * 6;
      velocities.push(
        Math.sin(seed * 4.1) * 0.006,
        Math.sin(seed * 5.3) * 0.006,
        0
      );
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    const mat = new THREE.PointsMaterial({
      color: 0x2dd4bf, size: 0.07, transparent: true, opacity: 0.55,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // Static connection lines computed once from initial positions
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x0d9488, transparent: true, opacity: 0.12,
    });
    const linePos = [];
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = positions[i * 3]     - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        if (Math.sqrt(dx * dx + dy * dy) < 2.8) {
          linePos.push(
            positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
            positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
          );
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePos), 3));
    scene.add(new THREE.LineSegments(lineGeo, lineMat));

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);

    return { scene, camera, renderer, points, velocities, count };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const { scene, camera, renderer, points, velocities, count } = state;
    const t = frame / 30;

    // Drift particles deterministically from frame 0
    const pos = points.geometry.attributes.position;
    const basePositions = pos.array.slice(); // snapshot at current frame
    // Advance each particle by frame steps from its starting position
    for (let i = 0; i < count; i++) {
      let x = pos.array[i * 3]     + velocities[i * 3]     * frame;
      let y = pos.array[i * 3 + 1] + velocities[i * 3 + 1] * frame;
      // Wrap to bounds
      x = ((x + 8) % 16 + 16) % 16 - 8;
      y = ((y + 5) % 10 + 10) % 10 - 5;
      pos.array[i * 3]     = x;
      pos.array[i * 3 + 1] = y;
    }
    pos.needsUpdate = true;

    // Slow camera drift
    camera.position.x = Math.sin(t * 0.09) * 0.6;
    camera.position.y = Math.cos(t * 0.07) * 0.35;

    renderer.render(scene, camera);

    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(renderer.domElement, 0, 0);
  }, [frame]);

  return (
    <AbsoluteFill>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
    </AbsoluteFill>
  );
};
