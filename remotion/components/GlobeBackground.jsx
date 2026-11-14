/**
 * GlobeBackground: rotating Blue Marble globe with graticule, trade-wind belt,
 * and atmospheric shell — ported from the AOFD weather-basics kit (globe.tsx).
 * Uses the same canvas-ref pattern as ParticleCanvas so no extra dependencies are needed.
 * delayRender/continueRender handles async texture loading per Remotion's requirements.
 */
import { AbsoluteFill, useCurrentFrame, useVideoConfig, staticFile, delayRender, continueRender, cancelRender } from 'remotion';
import { useEffect, useRef, useMemo, useState } from 'react';
import * as THREE from 'three';

const D2R = Math.PI / 180;

/** lat/lon (degrees) to 3-D unit-sphere point (Y-up, same convention as AOFD globe.tsx) */
const ll3 = (lat, lon, r = 1) => {
  const la = lat * D2R, lo = lon * D2R;
  return [r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo)];
};

/** Push a pair of ll3 points (a line segment) into a flat array */
const seg = (pts, la1, lo1, la2, lo2, r = 1.0005) => {
  const a = ll3(la1, lo1, r), b = ll3(la2, lo2, r);
  pts.push(...a, ...b);
};

/** Build graticule line-segment geometry (lat/lon grid every `step` degrees) */
const buildGraticule = (step = 30) => {
  const pts = [];
  for (let lat = -90 + step; lat < 90; lat += step)
    for (let lon = -180; lon < 180; lon += 3)
      seg(pts, lat, lon, lat, lon + 3);
  for (let lon = -180; lon < 180; lon += step)
    for (let lat = -87; lat < 87; lat += 3)
      seg(pts, lat, lon, lat + 3, lon);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(pts), 3));
  return g;
};

/** Trade-wind belt latitude circles (amber) */
const buildTradeWindBelts = () => {
  const pts = [];
  for (const lat of [15, -15])
    for (let lon = -180; lon < 180; lon += 2)
      seg(pts, lat, lon, lat, lon + 2, 1.001);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(pts), 3));
  return g;
};

/** Equator ring (teal) */
const buildEquator = () => {
  const pts = [];
  for (let lon = -180; lon < 180; lon += 2)
    seg(pts, 0, lon, 0, lon + 2, 1.001);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(pts), 3));
  return g;
};

/** Tropic circles (Capricorn ±23.4°) */
const buildTropics = () => {
  const pts = [];
  for (const lat of [23.4, -23.4])
    for (let lon = -180; lon < 180; lon += 2)
      seg(pts, lat, lon, lat, lon + 2, 1.001);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(pts), 3));
  return g;
};

/**
 * Animated trade-wind particles: returns Float32Array of positions at the given frame.
 * N particles per belt, flowing westward (decreasing lon) at a fixed speed.
 */
const tradeWindPositions = (frame, N = 80, r = 1.003) => {
  const pts = new Float32Array(N * 2 * 3); // N particles per belt
  const speed = 0.6; // degrees of longitude per frame
  for (let i = 0; i < N; i++) {
    for (let b = 0; b < 2; b++) {
      const lat = b === 0 ? 15 : -15;
      const phase = (i / N) * 360;
      const lon = ((-frame * speed + phase) % 360 + 360) % 360 - 180;
      const p = ll3(lat, lon, r);
      const idx = (b * N + i) * 3;
      pts[idx] = p[0]; pts[idx + 1] = p[1]; pts[idx + 2] = p[2];
    }
  }
  return pts;
};

export const GlobeBackground = ({ opacity = 0.5 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvasRef = useRef(null);
  const [texture, setTexture] = useState(null);
  const handleRef = useRef(null);

  // Load Blue Marble texture once (Remotion-safe: delayRender/continueRender)
  useEffect(() => {
    const handle = delayRender('globe-blue-marble', { timeoutInMilliseconds: 60000 });
    handleRef.current = handle;
    new THREE.TextureLoader().load(
      staticFile('blue_marble.jpg'),
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        tex.wrapS = THREE.RepeatWrapping;
        setTexture(tex);
        continueRender(handle);
      },
      undefined,
      (err) => { cancelRender(err instanceof Error ? err : new Error(String(err))); }
    );
  }, []);

  // Build Three.js scene once (synchronous, no async)
  const scene3 = useMemo(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.z = 2.55;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);

    // Earth group (spins + tilted 23.4°)
    const earthGroup = new THREE.Group();
    earthGroup.rotation.z = 23.4 * D2R;
    scene.add(earthGroup);

    // Globe sphere
    const geo = new THREE.SphereGeometry(1, 128, 64);
    const mat = new THREE.MeshBasicMaterial({ color: 0x1a2a3a });
    const globe = new THREE.Mesh(geo, mat);
    earthGroup.add(globe);

    // Graticule
    const gratMat = new THREE.LineBasicMaterial({ color: 0x7a9cb8, transparent: true, opacity: 0.18 });
    earthGroup.add(new THREE.LineSegments(buildGraticule(30), gratMat));

    // Equator
    const eqMat = new THREE.LineBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.5 });
    earthGroup.add(new THREE.LineSegments(buildEquator(), eqMat));

    // Tropics
    const tropMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.3 });
    earthGroup.add(new THREE.LineSegments(buildTropics(), tropMat));

    // Trade-wind belt lines (static lat circles)
    const twMat = new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.45 });
    earthGroup.add(new THREE.LineSegments(buildTradeWindBelts(), twMat));

    // Trade-wind animated particles
    const twPartGeo = new THREE.BufferGeometry();
    twPartGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(80 * 2 * 3), 3));
    const twPartMat = new THREE.PointsMaterial({ color: 0xfbbf24, size: 0.025, transparent: true, opacity: 0.9 });
    const twParticles = new THREE.Points(twPartGeo, twPartMat);
    earthGroup.add(twParticles);

    // Atmospheric shell (semi-transparent, back-face inside)
    const atmGeo = new THREE.SphereGeometry(1.045, 64, 32);
    const atmMat = new THREE.MeshBasicMaterial({ color: 0x1e6fa0, transparent: true, opacity: 0.07, side: THREE.BackSide });
    scene.add(new THREE.Mesh(atmGeo, atmMat));

    // Soft point light
    const pt = new THREE.PointLight(0x4488cc, 0.6, 10);
    pt.position.set(-3, 2, 2);
    scene.add(pt);

    return { scene, camera, renderer, earthGroup, globe, mat, twParticles };
  }, []);

  // Render each frame deterministically
  useEffect(() => {
    if (!canvasRef.current) return;
    const { scene, camera, renderer, earthGroup, globe, mat, twParticles } = scene3;

    // Apply Blue Marble texture once loaded
    if (texture && mat.map !== texture) {
      mat.map = texture;
      mat.color.setScalar(1);
      mat.needsUpdate = true;
    }

    // Spin
    earthGroup.rotation.y = frame * 0.22 * D2R;

    // Update trade-wind particles
    const positions = tradeWindPositions(frame);
    twParticles.geometry.attributes.position.array.set(positions);
    twParticles.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);

    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    ctx.drawImage(renderer.domElement, 0, 0);
  }, [frame, texture]);

  return (
    <AbsoluteFill>
      {/* Dark space background */}
      <div style={{ position: 'absolute', inset: 0, background: '#06091a' }} />
      {/* Globe canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ position: 'absolute', inset: 0, opacity }}
      />
      {/* Radial vignette to darken center — keeps text readable */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 85% at 50% 50%, rgba(6,9,26,0.55) 0%, transparent 70%)',
      }} />
    </AbsoluteFill>
  );
};
