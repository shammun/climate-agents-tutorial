/*
 * flow_globe.js — shared code for the three real-data globe pages.
 *
 * A plain (non-module) script, so the pages also work when opened directly
 * from disk (file://). It needs three.global.min.js to be loaded first and
 * exposes one global object, window.FlowGlobe, with:
 *
 *   loadData(globalName, url)          → Promise of the processed JSON field
 *   createGlobe({ canvas, ... })       → renderer, camera, rotating Earth group
 *   createFlowLayer(globe, data, opts) → animated particle trails for one field
 *   PALETTES                           → colour ramps for wind and currents
 *
 * How the animation works (see guide/REAL_DATA_GLOBE_GUIDE.md, Part 3):
 *   Each particle has a position (lat, lon). Every frame it samples the u/v
 *   field at that point (bilinear interpolation), moves a little along the
 *   flow, and remembers its last TRAIL positions. The positions are drawn as
 *   short line segments whose brightness fades from head to tail, so each
 *   particle leaves a streak that shows the direction of the flow.
 */
(function () {
  'use strict';

  const DEG = Math.PI / 180;

  // ── data loading ────────────────────────────────────────────────────────
  // ../data/winds.js and ../data/currents.js set window.WIND_DATA / CURRENT_DATA
  // (works from file://). Over HTTP the .json files are fetched instead.
  function loadData(globalName, url) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    if (location.protocol === 'file:') {
      return Promise.reject(new Error('no data yet: run python/04_process_to_json.py'));
    }
    return fetch(url).then(r => {
      if (!r.ok) throw new Error(`no data yet (HTTP ${r.status}): run python/04_process_to_json.py`);
      return r.json();
    });
  }

  // ── geometry ────────────────────────────────────────────────────────────
  // Matches THREE.SphereGeometry's texture mapping: longitude -180 is the left
  // edge of an equirectangular image, so z must be -sin(lon). With +sin(lon)
  // the continents of the texture come out mirrored east-west.
  function llToXYZ(lat, lon, r, out, o) {
    const cl = Math.cos(lat * DEG);
    out[o]     =  r * cl * Math.cos(lon * DEG);
    out[o + 1] =  r * Math.sin(lat * DEG);
    out[o + 2] = -r * cl * Math.sin(lon * DEG);
  }

  // ── the globe ───────────────────────────────────────────────────────────
  function createGlobe({ canvas, textureUrl, dimTexture = 0.55, view = { lat: 15, lon: -40 }, distance = 3.3 }) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, distance);

    // Everything that turns with the Earth (texture + particle layers) lives in
    // one group, so dragging rotates them together.
    const earth = new THREE.Group();
    scene.add(earth);

    const sphere = new THREE.SphereGeometry(1, 96, 64);
    const mat = new THREE.MeshBasicMaterial({ color: 0x1c3d5e });
    if (textureUrl) {
      new THREE.TextureLoader().load(textureUrl, tex => {
        tex.colorSpace = THREE.SRGBColorSpace;
        mat.map = tex;
        // Darken the photo so the bright particle trails stand out on top of it.
        mat.color.setScalar(dimTexture);
        mat.needsUpdate = true;
      });
    }
    earth.add(new THREE.Mesh(sphere, mat));

    // Thin atmosphere rim
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.025, 64, 48),
      new THREE.MeshBasicMaterial({ color: 0x3a7bd5, transparent: true, opacity: 0.12, side: THREE.BackSide }),
    ));

    // ── orientation: the point (view.lat, view.lon) faces the camera ──
    const rot = { x: 0, y: 0 };
    function resetView() {
      // A point at longitude L sits at angle -L around the y axis (see llToXYZ);
      // the camera looks along -z, i.e. at angle 90°. Rotate y by -(90° + L).
      rot.y = -(90 + view.lon) * DEG;
      rot.x = view.lat * DEG;
      camera.position.z = distance;
    }
    resetView();

    // ── drag to rotate (mouse, pen and touch via pointer events) ──
    let dragging = false, lastX = 0, lastY = 0;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', e => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      if (!dragging) return;
      const k = 0.005 * camera.position.z / distance;  // slower when zoomed in
      rot.y += (e.clientX - lastX) * k;
      rot.x  = Math.max(-1.4, Math.min(1.4, rot.x + (e.clientY - lastY) * k));
      lastX = e.clientX; lastY = e.clientY;
    });
    const stop = () => { dragging = false; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);

    canvas.addEventListener('wheel', e => {
      camera.position.z = Math.max(1.6, Math.min(6, camera.position.z + e.deltaY * 0.002));
      e.preventDefault();
    }, { passive: false });

    function resize() {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      // Keep the whole globe visible on narrow (phone) screens
      camera.fov = camera.aspect < 0.8 ? 45 / Math.max(camera.aspect, 0.45) * 0.8 : 45;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();

    const frameCallbacks = [];
    function frame() {
      requestAnimationFrame(frame);
      earth.rotation.set(rot.x, rot.y, 0, 'XYZ');
      for (const cb of frameCallbacks) cb();
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);

    return { renderer, scene, camera, earth, rot, resetView, onFrame: cb => frameCallbacks.push(cb) };
  }

  // ── colour ramps ────────────────────────────────────────────────────────
  // Stops are [t, r, g, b] with t in 0..1.
  const PALETTES = {
    wind: [
      [0.00, 0.20, 0.45, 0.70],
      [0.35, 0.00, 0.80, 0.75],
      [0.70, 0.95, 0.95, 0.55],
      [1.00, 1.00, 1.00, 1.00],
    ],
    current: [
      [0.00, 0.00, 0.75, 0.85],
      [0.35, 0.15, 0.45, 1.00],
      [0.70, 1.00, 0.47, 0.05],
      [1.00, 1.00, 0.85, 0.10],
    ],
  };
  function rampColor(stops, t, out) {
    t = Math.max(0, Math.min(1, t));
    let j = 0;
    while (j < stops.length - 2 && t > stops[j + 1][0]) j++;
    const a = stops[j], b = stops[j + 1];
    const f = (t - a[0]) / (b[0] - a[0]);
    out[0] = a[1] + f * (b[1] - a[1]);
    out[1] = a[2] + f * (b[2] - a[2]);
    out[2] = a[3] + f * (b[3] - a[3]);
    return out;
  }
  function paletteCss(stops) {
    return 'linear-gradient(90deg,' + stops.map(s =>
      `rgb(${Math.round(s[1] * 255)},${Math.round(s[2] * 255)},${Math.round(s[3] * 255)}) ${Math.round(s[0] * 100)}%`
    ).join(',') + ')';
  }

  // ── one animated flow layer ─────────────────────────────────────────────
  //   count      number of particles
  //   trail      positions remembered per particle (trail length in frames)
  //   degPerMs   how far (degrees) a 1 m/s flow moves a particle per frame
  //   speedExponent  1 = step proportional to speed; 0.5 = proportional to
  //              √speed, which keeps slow flows (most ocean currents) visible
  //   maxStep    cap on the per-frame move, in degrees (keeps fast jets sane)
  //   radius     height of the trails above the unit sphere
  //   palette    colour ramp; colourGamma < 1 spreads out the low speeds
  //   minSpeed   particles slower than this (m/s) are respawned, and new ones
  //              are only placed where the flow is at least this fast. For
  //              GODAS this keeps currents in the ocean: land cells are 0.
  //   opacity    overall brightness of the layer
  function createFlowLayer(globe, data, opts) {
    const o = Object.assign({
      count: 2500, trail: 12, degPerMs: 0.08, speedExponent: 1, maxStep: 1.2, radius: 1.004,
      palette: PALETTES.wind, colourGamma: 1, colourMax: data.speedMax * 0.8,
      minSpeed: 0, opacity: 0.9, minAge: 50, maxAgeRange: 90,
    }, opts);

    const NLAT = data.grid.nlat, NLON = data.grid.nlon;
    const LAT0 = data.grid.lat0, LON0 = data.grid.lon0;
    const DLAT = 180 / (NLAT - 1), DLON = 360 / NLON;
    const U = data.uField, V = data.vField;

    // Bilinear interpolation of (u, v) at (lat, lon); longitude wraps around.
    const uv = [0, 0];
    function sample(lat, lon) {
      let y = (lat - LAT0) / DLAT;
      y = Math.max(0, Math.min(NLAT - 1.0001, y));
      let x = ((lon - LON0) % 360 + 360) % 360 / DLON;
      const j = Math.floor(y), i = Math.floor(x) % NLON;
      const fy = y - j, fx = x - Math.floor(x);
      const i1 = (i + 1) % NLON, j1 = j + 1;
      const a = j * NLON + i, b = j * NLON + i1, c = j1 * NLON + i, d = j1 * NLON + i1;
      const w00 = (1 - fx) * (1 - fy), w01 = fx * (1 - fy), w10 = (1 - fx) * fy, w11 = fx * fy;
      uv[0] = w00 * U[a] + w01 * U[b] + w10 * U[c] + w11 * U[d];
      uv[1] = w00 * V[a] + w01 * V[b] + w10 * V[c] + w11 * V[d];
      return uv;
    }

    const T = o.trail;
    let N = 0, lat, lon, age, maxAge, hist, geo, posAttr, colAttr, mesh;
    const rgb = [0, 0, 0];

    function spawn(i, randomAge) {
      // Area-uniform random point on the sphere; retry until the flow is
      // fast enough (for currents: until the point is in the ocean).
      let la, lo, tries = 0;
      do {
        la = Math.asin(2 * Math.random() - 1) / DEG;
        lo = Math.random() * 360 - 180;
        sample(la, lo);
        tries++;
      } while (o.minSpeed > 0 && Math.hypot(uv[0], uv[1]) < o.minSpeed && tries < 40);
      lat[i] = la; lon[i] = lo;
      maxAge[i] = o.minAge + Math.random() * o.maxAgeRange;
      age[i] = randomAge ? Math.random() * maxAge[i] : 0;
      // Collapse the whole trail onto the new point (no streak across the globe)
      const h = i * T * 3;
      llToXYZ(la, lo, o.radius, hist, h);
      for (let k = 1; k < T; k++) {
        hist[h + k * 3] = hist[h]; hist[h + k * 3 + 1] = hist[h + 1]; hist[h + k * 3 + 2] = hist[h + 2];
      }
    }

    function build(n) {
      if (mesh) { globe.earth.remove(mesh); geo.dispose(); }
      N = n;
      lat = new Float32Array(N); lon = new Float32Array(N);
      age = new Float32Array(N); maxAge = new Float32Array(N);
      hist = new Float32Array(N * T * 3);          // trail history, newest first
      for (let i = 0; i < N; i++) spawn(i, true);

      // (T-1) line segments per particle, 2 vertices each
      const nv = N * (T - 1) * 2;
      geo = new THREE.BufferGeometry();
      posAttr = new THREE.BufferAttribute(new Float32Array(nv * 3), 3);
      colAttr = new THREE.BufferAttribute(new Float32Array(nv * 3), 3);
      posAttr.setUsage(THREE.DynamicDrawUsage);
      colAttr.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('position', posAttr);
      geo.setAttribute('color', colAttr);
      // Additive blending: overlapping trails glow, and black (faded) = invisible
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: o.opacity,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      mesh = new THREE.LineSegments(geo, mat);
      mesh.frustumCulled = false;
      globe.earth.add(mesh);
      writeBuffers();
    }

    function writeBuffers() {
      const P = posAttr.array, C = colAttr.array;
      let v = 0;
      for (let i = 0; i < N; i++) {
        const h = i * T * 3;
        sample(lat[i], lon[i]);
        const spd = Math.hypot(uv[0], uv[1]);
        rampColor(o.palette, Math.pow(spd / o.colourMax, o.colourGamma), rgb);
        // fade in over the first 10 frames, out over the last 15
        const life = Math.min(1, age[i] / 10, (maxAge[i] - age[i]) / 15);
        for (let k = 0; k < T - 1; k++) {
          const b0 = life * (1 - k / (T - 1));        // head bright → tail dark
          const b1 = life * (1 - (k + 1) / (T - 1));
          const p0 = h + k * 3, p1 = h + (k + 1) * 3;
          P[v * 3] = hist[p0]; P[v * 3 + 1] = hist[p0 + 1]; P[v * 3 + 2] = hist[p0 + 2];
          C[v * 3] = rgb[0] * b0; C[v * 3 + 1] = rgb[1] * b0; C[v * 3 + 2] = rgb[2] * b0;
          v++;
          P[v * 3] = hist[p1]; P[v * 3 + 1] = hist[p1 + 1]; P[v * 3 + 2] = hist[p1 + 2];
          C[v * 3] = rgb[0] * b1; C[v * 3 + 1] = rgb[1] * b1; C[v * 3 + 2] = rgb[2] * b1;
          v++;
        }
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }

    function step(speedScale) {
      for (let i = 0; i < N; i++) {
        age[i]++;
        sample(lat[i], lon[i]);
        const u = uv[0], vv = uv[1];
        const spd = Math.hypot(u, vv);
        if (age[i] > maxAge[i] || (o.minSpeed > 0 && spd < o.minSpeed * 0.5)) { spawn(i, false); continue; }

        // Move along the flow. Degrees of longitude shrink by cos(lat).
        // With speedExponent < 1 the step grows more slowly than the speed,
        // so weak flows still leave visible streaks (the colour shows the
        // true speed). speedExponent = 1 is a plain, proportional step.
        const k = o.degPerMs * speedScale *
          (o.speedExponent === 1 || spd === 0 ? 1 : Math.pow(spd, o.speedExponent - 1));
        let dLat = vv * k;
        let dLon = u * k / Math.max(0.05, Math.cos(lat[i] * DEG));
        const len = Math.hypot(dLat, dLon * Math.cos(lat[i] * DEG));
        const cap = o.maxStep * speedScale;
        if (len > cap) { dLat *= cap / len; dLon *= cap / len; }

        let la = lat[i] + dLat;
        if (la > 89.5 || la < -89.5) { spawn(i, false); continue; }
        lat[i] = la;
        lon[i] = ((lon[i] + dLon + 180) % 360 + 360) % 360 - 180;

        // shift the trail history back one slot and put the new head in front
        const h = i * T * 3;
        hist.copyWithin(h + 3, h, h + (T - 1) * 3);
        llToXYZ(lat[i], lon[i], o.radius, hist, h);
      }
      writeBuffers();
    }

    build(o.count);

    return {
      step,
      setCount: n => build(Math.max(100, Math.min(8000, n))),
      get count() { return N; },
      set visible(v) { mesh.visible = v; },
      get visible() { return mesh.visible; },
      legendCss: paletteCss(o.palette),
    };
  }

  window.FlowGlobe = { loadData, llToXYZ, createGlobe, createFlowLayer, PALETTES, paletteCss };
})();
