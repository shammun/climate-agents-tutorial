
/* Reading progress bar */
(function () {
  const bar = document.getElementById('progress');
  if (!bar) return;
  function update() {
    const h = document.documentElement;
    const pct = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
    bar.style.width = Math.min(100, pct) + '%';
  }
  window.addEventListener('scroll', update, { passive: true });
})();

/* Mobile menu */
(function () {
  const btn = document.getElementById('menuBtn');
  const toc = document.getElementById('toc');
  const scrim = document.getElementById('scrim');
  if (!btn || !toc) return;
  function open() {
    toc.classList.add('open');
    scrim.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    toc.classList.remove('open');
    scrim.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  btn.addEventListener('click', () => toc.classList.contains('open') ? close() : open());
  scrim.addEventListener('click', close);
  toc.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
})();

/* Scroll-spy TOC */
(function () {
  const links = document.querySelectorAll('.toc li li a');
  if (!links.length) return;
  const ids = Array.from(links).map(a => a.getAttribute('href').slice(1));
  const headings = ids.map(id => document.getElementById(id)).filter(Boolean);

  let active = null;
  function spy() {
    const scrollY = window.scrollY + 80;
    let cur = headings[0];
    for (const h of headings) {
      if (h.offsetTop <= scrollY) cur = h; else break;
    }
    if (cur && cur.id !== active) {
      active = cur.id;
      links.forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + active);
      });
    }
  }
  window.addEventListener('scroll', spy, { passive: true });
  spy();
})();

/* Diagram entrance animations */
(function () {
  const diagrams = document.querySelectorAll('.diagram');
  if (!diagrams.length) return;
  if (!('IntersectionObserver' in window)) {
    diagrams.forEach(d => d.classList.add('animate'));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('animate');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  diagrams.forEach(d => obs.observe(d));
})();

/* Toast helper */
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 1800);
}

/* Copy buttons */
document.addEventListener('click', e => {
  if (e.target.classList.contains('btn-copy')) {
    const block = e.target.closest('.code, .ex-view');
    const text = block ? (block.querySelector('code') || block.querySelector('pre')).textContent : '';
    navigator.clipboard.writeText(text).then(() => showToast('Copied!')).catch(() => showToast('Copy failed'));
  }
});

/* Download file buttons (template files) */
(function () {
  const REPO = document.body.dataset.repo || '';
  function triggerDownload(href, filename) {
    const a = document.createElement('a');
    a.href = href; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
  document.addEventListener('click', e => {
    if (e.target.classList.contains('btn-dl')) {
      const path = e.target.dataset.path;
      if (!path || !REPO) return;
      const url = REPO.replace(/\/$/, '') + '/raw/refs/heads/main/climate-agent-template/' + path;
      triggerDownload(url, path.split('/').pop());
    }
    if (e.target.id === 'zipBtn' || e.target.closest('#zipBtn')) {
      const base = document.querySelector('base')?.href || location.origin + location.pathname.replace(/[^/]*$/, '');
      triggerDownload(base + 'downloads/climate-agent-template.zip', 'climate-agent-template.zip');
    }
    if (e.target.classList.contains('btn-gh')) {
      window.open(REPO, '_blank', 'noopener');
    }
  });
})();

/* File explorer */
(function () {
  const explorer = document.getElementById('explorer');
  if (!explorer) return;
  const pathEl = explorer.querySelector('.ex-path');
  const copyBtn = explorer.querySelector('.ex-copy');
  const dlBtn = explorer.querySelector('.ex-dl');
  const pre = explorer.querySelector('.ex-view pre code');

  function select(btn) {
    explorer.querySelectorAll('.ex-tree button.sel').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    const path = btn.dataset.path;
    const content = btn.dataset.content || '';
    if (pathEl) pathEl.textContent = path;
    if (pre) pre.textContent = content;
    if (dlBtn) dlBtn.dataset.path = path;
    if (explorer.querySelector('.ex-title-path'))
      explorer.querySelector('.ex-title-path').textContent = 'climate-agent-template / ' + path;
  }

  explorer.querySelectorAll('.ex-tree .dir > button').forEach(btn => {
    btn.addEventListener('click', () => {
      const li = btn.parentElement;
      li.classList.toggle('open');
    });
  });

  explorer.querySelectorAll('.ex-tree .file > button').forEach(btn => {
    btn.addEventListener('click', () => select(btn));
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (!pre) return;
      navigator.clipboard.writeText(pre.textContent).then(() => showToast('Copied!')).catch(() => showToast('Copy failed'));
    });
  }

  const first = explorer.querySelector('.ex-tree .file > button');
  if (first) { first.closest('.dir')?.classList.add('open'); select(first); }
})();

/* Video graceful degradation */
(function () {
  const vid = document.getElementById('buildingAgentsVideo');
  const unavail = document.getElementById('videoUnavailable2');
  if (!vid || !unavail) return;
  vid.addEventListener('error', () => { vid.style.display = 'none'; unavail.style.display = 'block'; });
  if (vid.error) { vid.style.display = 'none'; unavail.style.display = 'block'; }
})();

/* Hero globe: Blue Marble with animated ocean currents, trade winds and jet streams.
   Three.js is loaded on demand from assets/three.module.min.js (copied in by the build).
   Texture: NASA Blue Marble Next Generation (public domain). All paths are approximate
   climatological sketches drawn by hand, not data. */
(function initHeroGlobe() {
  const canvas = document.getElementById('globeCanvas');
  const hero = canvas && canvas.closest('.hero');
  if (!canvas || !hero) return;

  const scriptSrc = (document.currentScript && document.currentScript.src)
    || new URL('assets/app.js', document.baseURI).href;
  const assetUrl = name => new URL(name, scriptSrc).href;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COAST_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json';

  /* flow data: [lat, lon] waypoints in flow direction; speed in radians of arc per second */
  const FLOWS = [
    { name: 'Gulf Stream', desc: 'Warm western boundary current of the North Atlantic.',
      color: '#f59e0b', speed: 0.10,
      pts: [[24.2,-81.5],[26,-79.7],[30,-79.5],[33,-77],[35.5,-74.3],[38,-70],[39.5,-64],[40.5,-57],[42,-50],[45,-43],[48,-36]] },
    { name: 'North Atlantic Drift', desc: 'Warm extension of the Gulf Stream toward north-west Europe.',
      color: '#fbbf24', speed: 0.05,
      pts: [[48,-34],[51,-26],[55,-18],[59,-10],[62.5,-3],[66,5],[69,12]] },
    { name: 'Kuroshio Current', desc: 'Warm western boundary current of the North Pacific.',
      color: '#22d3ee', speed: 0.09,
      pts: [[16,123.8],[20,122.6],[24,122.8],[27,125.8],[29.5,129.5],[31.5,132.5],[33,136],[34.3,139.5],[35.3,142],[36,147],[35.5,153],[36.5,160],[37.5,168]] },
    { name: 'Antarctic Circumpolar Current', desc: 'Flows east around Antarctica; the largest current on Earth by volume.',
      color: '#60a5fa', speed: 0.05, closed: true,
      pts: [[-58,-180],[-59,-160],[-60,-140],[-60,-120],[-60,-100],[-60,-80],[-59,-65],[-56,-55],[-52,-40],[-50,-20],[-50,0],[-49,20],[-48,40],[-48,60],[-50,80],[-51,100],[-53,120],[-55,140],[-57,160]] },
    { name: 'Agulhas Current', desc: 'Warm western boundary current of the south-west Indian Ocean; it turns back east south of Africa.',
      color: '#a78bfa', speed: 0.085,
      pts: [[-11.5,51],[-11.5,47],[-13,43.5],[-17,41],[-22,37.5],[-25.5,35],[-29,33],[-32,30.2],[-34.5,26.5],[-36.5,22],[-38.5,18.5],[-40.3,19.5],[-40.5,24],[-39.5,30]] },
    { name: 'Equatorial Counter-Current', desc: 'Flows east between the two westward equatorial currents (Pacific branch).',
      color: '#2dd4bf', speed: 0.04,
      pts: [[5,130],[5.5,150],[6,170],[6.5,-170],[7,-150],[7,-130],[6.5,-110],[6,-95],[6,-86]] },
    { name: 'Equatorial Counter-Current', desc: 'Flows east between the two westward equatorial currents (Atlantic branch).',
      color: '#2dd4bf', speed: 0.04,
      pts: [[6,-42],[6.5,-34],[6,-26],[5,-18],[4,-10],[3.5,-3],[3.5,3]] },
    { name: 'Equatorial Counter-Current', desc: 'Flows east just south of the equator (Indian Ocean branch).',
      color: '#2dd4bf', speed: 0.04,
      pts: [[-3,46],[-3.5,56],[-4,66],[-4,76],[-3.5,86],[-3,94]] },
    { name: 'California Current', desc: 'Cold eastern boundary current; flows south along western North America.',
      color: '#7dd3fc', speed: 0.045,
      pts: [[46,-126],[42,-126.5],[38,-125.5],[34,-123],[30,-120],[26,-117],[22,-114]] },
    { name: 'Canary Current', desc: 'Cold eastern boundary current; flows south along north-west Africa.',
      color: '#7dd3fc', speed: 0.045,
      pts: [[40,-13],[36,-13.5],[32,-14],[28,-16.5],[24,-19],[20,-20.5],[16,-22]] },
    { name: 'Brazil Current', desc: 'Warm western boundary current of the South Atlantic; flows south.',
      color: '#fb923c', speed: 0.06,
      pts: [[-8,-33.5],[-13,-37],[-18,-37.5],[-23,-40],[-27,-45.5],[-31,-48.5],[-36,-52]] },
    { name: 'Labrador Current', desc: 'Cold current; flows south from the Arctic past Labrador and Newfoundland.',
      color: '#bfdbfe', speed: 0.05,
      pts: [[60,-60],[57,-57.5],[54,-53.5],[51,-51],[48,-48.5],[45,-49.5],[43,-52]] },
    { name: 'Humboldt (Peru) Current', desc: 'Cold eastern boundary current; flows north along western South America.',
      color: '#7dd3fc', speed: 0.045,
      pts: [[-42,-76],[-36,-75],[-30,-73.5],[-24,-72.5],[-18,-73.5],[-12,-79],[-6,-83]] },
    { name: 'East Australian Current', desc: 'Warm western boundary current of the South Pacific; flows south.',
      color: '#f472b6', speed: 0.07,
      pts: [[-15,147.5],[-20,151.5],[-25,154.5],[-30,154.3],[-34,152.8],[-37,151.5]] },
    { name: 'Somali Current', desc: 'Seasonal: reverses with the monsoon. Shown in its northward summer state.',
      color: '#c084fc', speed: 0.08,
      pts: [[-2,42.5],[2,46.5],[6,50],[10,52.5],[13.5,56]] },
  ];
  /* Polar jet streams: meandering west-to-east bands, drawn above the surface */
  const JET_DESC = 'Fast westerly winds near 10 km altitude that meander around the globe.';
  [[-3, 0.92], [0, 1], [3, 0.92]].forEach(([dLat, gain]) => {
    const north = [], south = [];
    for (let lon = -180; lon < 180; lon += 10) {
      const r = lon * Math.PI / 180;
      north.push([49 + dLat + 8 * Math.sin(4 * r + 0.6) + 3 * Math.sin(2 * r), lon]);
      south.push([-51 + dLat + 5 * Math.sin(3 * r + 1.2), lon]);
    }
    FLOWS.push({ name: 'Polar jet stream', desc: JET_DESC, color: '#fde9b0', speed: 0.3, closed: true, jet: true, gain, pts: north });
    FLOWS.push({ name: 'Polar jet stream', desc: JET_DESC, color: '#fde9b0', speed: 0.3, closed: true, jet: true, gain, pts: south });
  });
  const TRADE = { color: '#fbbf24', degPerSec: 18, latFrom: 24, latTo: 10, dLon: 40 };
  const TRADE_TIPS = {
    n: { name: 'Trade winds (north-east)', desc: 'Steady surface winds that blow from the north-east toward the equator.' },
    s: { name: 'Trade winds (south-east)', desc: 'Steady surface winds that blow from the south-east toward the equator.' },
  };
  const LABELS = [
    { text: 'Trade winds', lat: 17, lon: -45 }, { text: 'Trade winds', lat: 17, lon: -150 },
    { text: 'Trade winds', lat: 17, lon: 140 }, { text: 'Trade winds', lat: -17, lon: -105 },
    { text: 'Trade winds', lat: -17, lon: -12 }, { text: 'Trade winds', lat: -17, lon: 78 },
    { text: 'Polar jet stream', lat: 56, lon: -35, jet: true }, { text: 'Polar jet stream', lat: 56, lon: 150, jet: true },
    { text: 'Polar jet stream', lat: -57, lon: 95, jet: true }, { text: 'Polar jet stream', lat: -57, lon: -120, jet: true },
  ];

  import(assetUrl('three.module.min.js')).then(start).catch(() => { /* no WebGL or no module: keep the plain gradient */ });

  function start(T) {
    const D2R = Math.PI / 180;
    /* matches the UV layout of THREE.SphereGeometry with an equirectangular map (lon -180 at u = 0) */
    const ll = (lat, lon, r) => {
      const a = lat * D2R, b = lon * D2R, c = Math.cos(a) * r;
      return [c * Math.cos(b), Math.sin(a) * r, -c * Math.sin(b)];
    };
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    let seed = 20261113;
    const rand = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(45, 2, 0.1, 100);
    camera.position.set(0, 0, 2.5);
    const tilt = new T.Group(), spin = new T.Group();
    tilt.add(spin); scene.add(tilt);
    tilt.rotation.x = 0.3;
    spin.rotation.y = (-90 + 48) * D2R; /* start with the North Atlantic facing the viewer */

    let W = 1, H = 1, globePx = 300, dirty = true;
    let raf = 0, visible = true, last = performance.now(), time = 0;

    /* shared glowing-point material */
    const scaleU = { value: 1 };
    const pointMaterial = () => new T.ShaderMaterial({
      uniforms: { uScale: scaleU },
      vertexShader: [
        'attribute float aSize; attribute float aAlpha; attribute vec3 aColor;',
        'uniform float uScale; varying float vA; varying vec3 vC;',
        'void main() { vA = aAlpha; vC = aColor;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '  gl_PointSize = aSize * uScale; }'].join('\n'),
      fragmentShader: [
        'varying float vA; varying vec3 vC;',
        'void main() {',
        '  float d = length(gl_PointCoord - 0.5) * 2.0;',
        '  float a = pow(max(0.0, 1.0 - d), 1.8);',
        '  gl_FragColor = vec4(vC, vA * a);',
        '  #include <colorspace_fragment>',
        '}'].join('\n'),
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    });
    const makePoints = (n, order, parent) => {
      const g = new T.BufferGeometry();
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n);
      g.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage));
      g.setAttribute('aColor', new T.BufferAttribute(col, 3));
      g.setAttribute('aSize', new T.BufferAttribute(size, 1));
      g.setAttribute('aAlpha', new T.BufferAttribute(alpha, 1).setUsage(T.DynamicDrawUsage));
      const p = new T.Points(g, pointMaterial());
      p.frustumCulled = false; p.renderOrder = order; parent.add(p);
      return { g, pos, col, size, alpha };
    };

    /* stars (static backdrop) */
    {
      const n = 260, s = makePoints(n, -1, scene);
      for (let i = 0; i < n; i++) {
        s.pos.set([(rand() - 0.5) * 120, (rand() - 0.5) * 40, -40 - rand() * 10], i * 3);
        const w = 0.75 + rand() * 0.25;
        s.col.set([w, w, 1], i * 3);
        s.size[i] = 1.4 + rand() * 2.2; s.alpha[i] = 0.2 + rand() * 0.6;
      }
    }

    /* globe */
    const globeMat = new T.MeshBasicMaterial({ color: 0x0b2238 }); /* fallback if the texture fails */
    spin.add(new T.Mesh(new T.SphereGeometry(1, 128, 64), globeMat));

    /* graticule every 30 degrees */
    {
      const v = [];
      for (let lat = -60; lat <= 60; lat += 30) for (let lon = -180; lon < 180; lon += 3) v.push(...ll(lat, lon, 1.002), ...ll(lat, lon + 3, 1.002));
      for (let lon = -180; lon < 180; lon += 30) for (let lat = -87; lat < 87; lat += 3) v.push(...ll(lat, lon, 1.002), ...ll(lat + 3, lon, 1.002));
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(v, 3));
      const m = new T.LineSegments(g, new T.LineBasicMaterial({ color: 0x9ccfe8, transparent: true, opacity: 0.13, depthWrite: false }));
      m.renderOrder = 2; spin.add(m);
    }

    /* atmosphere: soft rim on the surface plus a halo shell */
    const atmoVertex = 'varying vec3 vN; varying vec3 vP; void main() { vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vP = mv.xyz; gl_Position = projectionMatrix * mv; }';
    const rim = new T.Mesh(new T.SphereGeometry(1.003, 96, 48), new T.ShaderMaterial({
      vertexShader: atmoVertex,
      fragmentShader: 'varying vec3 vN; varying vec3 vP; void main() { float f = 1.0 - max(0.0, dot(normalize(vN), normalize(-vP))); gl_FragColor = vec4(vec3(0.35, 0.68, 1.0), pow(f, 2.6) * 0.75); }',
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    }));
    rim.renderOrder = 1; spin.add(rim);
    const halo = new T.Mesh(new T.SphereGeometry(1.2, 96, 48), new T.ShaderMaterial({
      vertexShader: atmoVertex,
      fragmentShader: 'varying vec3 vN; varying vec3 vP; void main() { float d = max(0.0, -dot(normalize(vN), normalize(-vP))); gl_FragColor = vec4(vec3(0.22, 0.6, 1.0), pow(clamp(d * 1.8, 0.0, 1.0), 2.4) * 0.85); }',
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.BackSide,
    }));
    halo.renderOrder = 8; scene.add(halo);

    /* coastlines (optional; silently skipped if the request fails) */
    fetch(COAST_URL).then(r => r.ok ? r.json() : Promise.reject()).then(topo => {
      const sc = topo.transform.scale, tr = topo.transform.translate, v = [];
      for (const arc of topo.arcs) {
        let x = 0, y = 0, prev = null;
        for (const d of arc) {
          x += d[0]; y += d[1];
          const p = ll(y * sc[1] + tr[1], x * sc[0] + tr[0], 1.003);
          if (prev) v.push(prev[0], prev[1], prev[2], p[0], p[1], p[2]);
          prev = p;
        }
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(v, 3));
      const m = new T.LineSegments(g, new T.LineBasicMaterial({ color: 0x8ff0e0, transparent: true, opacity: 0.32, depthWrite: false }));
      m.renderOrder = 3; spin.add(m); dirty = true; schedule();
    }).catch(() => {});

    /* flow paths: Catmull-Rom through the waypoints, resampled to even arc length */
    const cr = (a, b, c, d, t) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
    function buildPath(pts, closed, radius) {
      const P = pts.map(p => [p[0], p[1]]);
      for (let i = 1; i < P.length; i++) {
        while (P[i][1] - P[i - 1][1] > 180) P[i][1] -= 360;
        while (P[i][1] - P[i - 1][1] < -180) P[i][1] += 360;
      }
      const n = P.length;
      const get = i => {
        if (!closed) return P[clamp(i, 0, n - 1)];
        const q = P[((i % n) + n) % n];
        return [q[0], q[1] + 360 * Math.floor(i / n)];
      };
      const raw = [], segs = closed ? n : n - 1, SUB = 14;
      for (let s = 0; s < segs; s++) {
        const a = get(s - 1), b = get(s), c = get(s + 1), d = get(s + 2);
        for (let j = 0; j < SUB; j++) raw.push(ll(cr(a[0], b[0], c[0], d[0], j / SUB), cr(a[1], b[1], c[1], d[1], j / SUB), radius));
      }
      raw.push(closed ? raw[0] : ll(P[n - 1][0], P[n - 1][1], radius));
      const cum = [0];
      for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1], raw[i][2] - raw[i - 1][2]));
      const len = cum[cum.length - 1], m = Math.max(24, Math.ceil(len / 0.008));
      const pos = new Float32Array((m + 1) * 3);
      for (let i = 0, k = 0; i <= m; i++) {
        const target = len * i / m;
        while (k < raw.length - 2 && cum[k + 1] < target) k++;
        const t = cum[k + 1] > cum[k] ? clamp((target - cum[k]) / (cum[k + 1] - cum[k]), 0, 1) : 0;
        for (let c = 0; c < 3; c++) pos[i * 3 + c] = raw[k][c] + (raw[k + 1][c] - raw[k][c]) * t;
      }
      return { pos, m, len, closed };
    }
    function samplePath(path, s, out, o) {
      const f = clamp(s, 0, 1) * path.m, i = Math.min(Math.floor(f), path.m - 1), t = f - i, p = path.pos;
      out[o] = p[i * 3] + (p[i * 3 + 3] - p[i * 3]) * t;
      out[o + 1] = p[i * 3 + 1] + (p[i * 3 + 4] - p[i * 3 + 1]) * t;
      out[o + 2] = p[i * 3 + 2] + (p[i * 3 + 5] - p[i * 3 + 2]) * t;
    }

    const TAIL = 14;
    let nFlowPts = 0, nArrows = 0;
    const flows = FLOWS.map(f => {
      const path = buildPath(f.pts, !!f.closed, f.jet ? 1.035 : 1.007);
      const n = Math.max(3, Math.round(path.len / (f.jet ? 0.2 : 0.085)));
      const tailLen = f.jet ? 0.16 : 0.028 + f.speed * 0.32;
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(path.pos, 3));
      const color = new T.Color(f.color);
      const baseOpacity = f.jet ? 0.14 : 0.42;
      const line = new T.Line(g, new T.LineBasicMaterial({ color, transparent: true, opacity: baseOpacity, depthWrite: false, blending: T.AdditiveBlending }));
      line.renderOrder = 4; spin.add(line);
      const phases = [];
      for (let i = 0; i < n; i++) phases.push((i + (rand() - 0.5) * 0.5) / n);
      const arrows = f.jet ? (f.gain === 1 ? 4 : 0) : Math.max(1, Math.round(path.len / 0.9));
      const flow = { f, path, n, color, line, baseOpacity, phases, arrows, tailStep: tailLen / TAIL / path.len, offset: nFlowPts, arrowOffset: nArrows };
      nFlowPts += n * TAIL; nArrows += arrows;
      return flow;
    });

    const flowPts = makePoints(nFlowPts, 6, spin);
    const tailFall = [];
    for (let k = 0; k < TAIL; k++) tailFall.push(k === 0 ? 1 : Math.pow(1 - k / TAIL, 1.3) * 0.9);
    flows.forEach(fl => {
      for (let p = 0; p < fl.n; p++) for (let k = 0; k < TAIL; k++) {
        const i = fl.offset + p * TAIL + k;
        flowPts.col.set([fl.color.r, fl.color.g, fl.color.b], i * 3);
        flowPts.size[i] = (k === 0 ? 8 : 5.2 - 3.4 * k / TAIL) * (fl.f.jet ? 0.8 : 1);
      }
    });

    /* trade winds: short streaks drifting west and toward the equator in both hemispheres */
    const TT = 9, tradeColor = new T.Color(TRADE.color), trades = [];
    for (const hemi of [1, -1]) for (let row = 0; row < 2; row++) for (let lon = -180; lon < 180; lon += 5) {
      trades.push({ hemi, lon: lon + row * 2.5 + (rand() - 0.5) * 2, lat0: TRADE.latFrom - row * 5 + (rand() - 0.5) * 3, phase: rand() });
    }
    const tradePts = makePoints(trades.length * TT, 5, spin);
    for (let i = 0; i < trades.length * TT; i++) {
      const k = i % TT;
      tradePts.col.set([tradeColor.r, tradeColor.g, tradeColor.b], i * 3);
      tradePts.size[i] = k === 0 ? 4.2 : 3.4 - 1.8 * k / TT;
    }

    /* direction arrows that glide along each current */
    const arrowPos = new Float32Array(nArrows * 9), arrowCol = new Float32Array(nArrows * 9), arrowAlpha = new Float32Array(nArrows * 3);
    const arrowGeo = new T.BufferGeometry();
    arrowGeo.setAttribute('position', new T.BufferAttribute(arrowPos, 3).setUsage(T.DynamicDrawUsage));
    arrowGeo.setAttribute('aColor', new T.BufferAttribute(arrowCol, 3));
    arrowGeo.setAttribute('aAlpha', new T.BufferAttribute(arrowAlpha, 1).setUsage(T.DynamicDrawUsage));
    flows.forEach(fl => {
      const c = fl.color.clone().lerp(new T.Color(0xffffff), 0.55);
      for (let a = 0; a < fl.arrows * 3; a++) arrowCol.set([c.r, c.g, c.b], (fl.arrowOffset * 3 + a) * 3);
    });
    const arrowMesh = new T.Mesh(arrowGeo, new T.ShaderMaterial({
      vertexShader: 'attribute vec3 aColor; attribute float aAlpha; varying vec3 vC; varying float vA; void main() { vC = aColor; vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: ['varying vec3 vC; varying float vA;', 'void main() {', '  gl_FragColor = vec4(vC, vA);', '  #include <colorspace_fragment>', '}'].join('\n'),
      transparent: true, depthWrite: false, side: T.DoubleSide,
    }));
    arrowMesh.frustumCulled = false; arrowMesh.renderOrder = 7; spin.add(arrowMesh);
    const tmpA = [0, 0, 0], tmpB = [0, 0, 0];

    function updateFlows(time) {
      /* current and jet particles with fading tails */
      for (const fl of flows) {
        const path = fl.path, adv = time * fl.f.speed / path.len, gain = fl.f.gain || 1;
        for (let p = 0; p < fl.n; p++) {
          let s0 = (fl.phases[p] + adv) % 1; if (s0 < 0) s0 += 1;
          for (let k = 0; k < TAIL; k++) {
            const i = fl.offset + p * TAIL + k;
            let s = s0 - k * fl.tailStep, a = tailFall[k] * gain;
            if (path.closed) s -= Math.floor(s);
            else if (s < 0) { s = 0; a = 0; }
            else a *= smooth(0, 0.1, s) * (1 - smooth(0.9, 1, s));
            samplePath(path, s, flowPts.pos, i * 3);
            flowPts.alpha[i] = a;
          }
        }
        /* arrows */
        const L = fl.f.jet ? 0.032 : 0.026, AW = L * 0.4;
        for (let a = 0; a < fl.arrows; a++) {
          const s = ((a + 0.5) / fl.arrows + adv * 0.4) % 1;
          const fade = path.closed ? 1 : smooth(0.04, 0.22, s) * (1 - smooth(0.78, 0.96, s));
          const ds = L / path.len;
          samplePath(path, clamp(s - ds * 0.5, 0, 1), tmpA, 0);
          samplePath(path, clamp(s + ds * 0.5, 0, 1), tmpB, 0);
          let tx = tmpB[0] - tmpA[0], ty = tmpB[1] - tmpA[1], tz = tmpB[2] - tmpA[2];
          const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
          const cx = (tmpA[0] + tmpB[0]) / 2, cy = (tmpA[1] + tmpB[1]) / 2, cz = (tmpA[2] + tmpB[2]) / 2;
          let sx = cy * tz - cz * ty, sy = cz * tx - cx * tz, sz = cx * ty - cy * tx;
          const sl = Math.hypot(sx, sy, sz) || 1; sx /= sl; sy /= sl; sz /= sl;
          const o = (fl.arrowOffset + a) * 9, lift = 1.004;
          arrowPos[o] = (cx + tx * L * 0.6) * lift; arrowPos[o + 1] = (cy + ty * L * 0.6) * lift; arrowPos[o + 2] = (cz + tz * L * 0.6) * lift;
          arrowPos[o + 3] = (cx - tx * L * 0.4 + sx * AW) * lift; arrowPos[o + 4] = (cy - ty * L * 0.4 + sy * AW) * lift; arrowPos[o + 5] = (cz - tz * L * 0.4 + sz * AW) * lift;
          arrowPos[o + 6] = (cx - tx * L * 0.4 - sx * AW) * lift; arrowPos[o + 7] = (cy - ty * L * 0.4 - sy * AW) * lift; arrowPos[o + 8] = (cz - tz * L * 0.4 - sz * AW) * lift;
          const al = fade * (0.8 + 0.2 * Math.sin(time * 2.4 + a)), ao = (fl.arrowOffset + a) * 3;
          arrowAlpha[ao] = al; arrowAlpha[ao + 1] = al; arrowAlpha[ao + 2] = al;
        }
      }
      flowPts.g.attributes.position.needsUpdate = true; flowPts.g.attributes.aAlpha.needsUpdate = true;
      arrowGeo.attributes.position.needsUpdate = true; arrowGeo.attributes.aAlpha.needsUpdate = true;

      /* trade winds */
      const rate = TRADE.degPerSec / TRADE.dLon, dLat = TRADE.latFrom - TRADE.latTo;
      for (let j = 0; j < trades.length; j++) {
        const tw = trades[j], t0 = (tw.phase + time * rate) % 1;
        for (let k = 0; k < TT; k++) {
          const i = j * TT + k, t = t0 - k * 0.016;
          if (t < 0) { tradePts.alpha[i] = 0; continue; }
          tradePts.pos.set(ll(tw.hemi * (tw.lat0 - dLat * t), tw.lon - TRADE.dLon * t, 1.012), i * 3);
          tradePts.alpha[i] = Math.sin(Math.PI * t) * Math.pow(1 - k / TT, 1.4) * 0.8;
        }
      }
      tradePts.g.attributes.position.needsUpdate = true; tradePts.g.attributes.aAlpha.needsUpdate = true;
    }

    /* DOM overlays: belt labels and the hover tooltip */
    const labelBox = document.createElement('div');
    labelBox.className = 'globe-labels'; labelBox.setAttribute('aria-hidden', 'true');
    const labels = LABELS.map(l => {
      const el = document.createElement('span');
      el.className = 'globe-label' + (l.jet ? ' jet' : '');
      el.textContent = l.text; el.style.opacity = '0';
      labelBox.appendChild(el);
      return { el, v: new T.Vector3(...ll(l.lat, l.lon, l.jet ? 1.035 : 1.012)) };
    });
    hero.insertBefore(labelBox, hero.querySelector('.hero-content'));
    const tip = document.createElement('div');
    tip.className = 'globe-tip'; tip.setAttribute('aria-hidden', 'true');
    const tipDot = document.createElement('span'); tipDot.className = 'tip-dot';
    const tipName = document.createElement('span');
    const tipDesc = document.createElement('span'); tipDesc.className = 'tip-desc';
    tip.append(tipDot, tipName, tipDesc);
    hero.appendChild(tip);

    const v3 = new T.Vector3(), inv = new T.Matrix4(), ray = new T.Raycaster(), unit = new T.Sphere(new T.Vector3(), 1), ndc = new T.Vector2();

    const contentEl = hero.querySelector('.hero-content');
    let textBox = null; /* hero text rectangle, relative to the hero */
    function updateLabels() {
      for (const l of labels) {
        v3.copy(l.v).applyMatrix4(spin.matrixWorld);
        const facing = (v3.dot(camera.position) - v3.lengthSq()) / camera.position.length();
        if (facing < 0.25) { l.el.style.opacity = '0'; continue; }
        v3.project(camera);
        const lx = (v3.x * 0.5 + 0.5) * W, ly = (-v3.y * 0.5 + 0.5) * H;
        if (textBox && lx > textBox.l - 70 && lx < textBox.r + 70 && ly > textBox.t - 16 && ly < textBox.b + 16) { l.el.style.opacity = '0'; continue; }
        l.el.style.opacity = String(Math.min(0.9, (facing - 0.25) * 2.2));
        l.el.style.transform = 'translate(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px) translate(-50%,-50%)';
      }
    }

    /* which flow is under the pointer? (x, y in CSS pixels relative to the hero) */
    function pick(x, y) {
      let best = null, bestD = 18 * 18;
      for (const fl of flows) {
        const p = fl.path, step = Math.max(1, Math.floor(p.m / 90));
        for (let i = 0; i <= p.m; i += step) {
          v3.fromArray(p.pos, i * 3).applyMatrix4(spin.matrixWorld);
          if (v3.dot(camera.position) - v3.lengthSq() < 0.08) continue; /* far side */
          v3.project(camera);
          const dx = (v3.x * 0.5 + 0.5) * W - x, dy = (-v3.y * 0.5 + 0.5) * H - y, d = dx * dx + dy * dy;
          if (d < bestD) { bestD = d; best = fl; }
        }
      }
      if (best) return { name: best.f.name, desc: best.f.desc, color: best.f.color };
      ndc.set(x / W * 2 - 1, -(y / H) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectSphere(unit, v3)) {
        v3.applyMatrix4(inv.copy(spin.matrixWorld).invert());
        const lat = Math.asin(clamp(v3.y / v3.length(), -1, 1)) / D2R;
        if (Math.abs(lat) >= 9 && Math.abs(lat) <= 25) return Object.assign({ color: TRADE.color }, lat > 0 ? TRADE_TIPS.n : TRADE_TIPS.s);
      }
      return null;
    }
    let tipTimer = 0;
    function showTip(hit, x, y) {
      for (const fl of flows) fl.line.material.opacity = hit && fl.f.name === hit.name ? Math.min(1, fl.baseOpacity * 3) : fl.baseOpacity;
      dirty = true;
      if (!hit) { tip.classList.remove('show'); return; }
      tipDot.style.background = hit.color; tipName.textContent = hit.name; tipDesc.textContent = hit.desc;
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      const tx = clamp(x + 16, 8, Math.max(8, W - tw - 8)), ty = clamp(y - th - 14, 8, Math.max(8, H - th - 8));
      tip.style.transform = 'translate(' + tx.toFixed(0) + 'px,' + ty.toFixed(0) + 'px)';
      tip.classList.add('show');
    }

    /* pointer interaction (mouse, pen and touch); listeners sit on the hero because the text overlays the canvas */
    const AUTO = reduced ? 0 : 0.072; /* 0.0012 rad per frame at 60 fps */
    let vel = AUTO, dragging = false, moved = 0, lastX = 0, lastY = 0, lastT = 0, pointerId = null;
    const isControl = t => !!(t && t.closest && t.closest('a, button'));
    const local = e => { const r = hero.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

    hero.addEventListener('pointerdown', e => {
      if (isControl(e.target) || (e.pointerType === 'mouse' && e.button !== 0)) return;
      dragging = true; moved = 0; pointerId = e.pointerId;
      lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
      try { hero.setPointerCapture(e.pointerId); } catch {}
      hero.classList.add('is-dragging');
    });
    hero.addEventListener('pointermove', e => {
      if (dragging && e.pointerId === pointerId) {
        const dx = e.clientX - lastX, dy = e.clientY - lastY, now = performance.now(), k = 1 / globePx;
        moved += Math.abs(dx) + Math.abs(dy);
        spin.rotation.y += dx * k;
        tilt.rotation.x = clamp(tilt.rotation.x + dy * k, -1.2, 1.2);
        if (!reduced) vel = clamp(dx * k / Math.max(0.008, (now - lastT) / 1000), -2.5, 2.5);
        lastX = e.clientX; lastY = e.clientY; lastT = now; dirty = true;
        if (moved > 6) showTip(null);
        schedule();
        return;
      }
      if (e.pointerType === 'touch') return;
      if (isControl(e.target)) { showTip(null); schedule(); return; }
      const p = local(e); showTip(pick(p[0], p[1]), p[0], p[1]);
      schedule();
    });
    const endDrag = e => {
      if (!dragging || e.pointerId !== pointerId) return;
      dragging = false; hero.classList.remove('is-dragging');
      try { hero.releasePointerCapture(e.pointerId); } catch {}
      if (performance.now() - lastT > 120) vel = 0;
      if (e.type === 'pointerup' && moved <= 6 && e.pointerType !== 'mouse') { /* tap: show the label briefly */
        const p = local(e); showTip(pick(p[0], p[1]), p[0], p[1]);
        clearTimeout(tipTimer); tipTimer = setTimeout(() => { showTip(null); schedule(); }, 2600);
      }
      schedule();
    };
    hero.addEventListener('pointerup', endDrag);
    hero.addEventListener('pointercancel', endDrag);
    hero.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') { showTip(null); schedule(); } });

    /* sizing */
    function resize() {
      W = Math.max(1, hero.clientWidth); H = Math.max(1, hero.clientHeight);
      if (contentEl) {
        const hr = hero.getBoundingClientRect(), cr2 = contentEl.getBoundingClientRect();
        textBox = { l: cr2.left - hr.left, r: cr2.right - hr.left, t: cr2.top - hr.top, b: cr2.bottom - hr.top };
      }
      const pr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(pr);
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      /* camera at z = 2.5 unless the hero is narrow; then pull back so the globe keeps some limb in view */
      const k = Math.tan(22.5 * D2R), full = (H / 2) / (k * Math.sqrt(2.5 * 2.5 - 1));
      globePx = Math.min(full, W * 0.62);
      camera.position.z = Math.sqrt(1 + Math.pow((H / 2) / (globePx * k), 2));
      camera.updateProjectionMatrix();
      scaleU.value = pr * clamp(globePx / 360, 0.6, 1.25);
      dirty = true; schedule();
    }

    /* render loop: paused when the hero is off screen or the tab is hidden */
    function frame(now) {
      raf = 0;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      if (!reduced) {
        time += dt;
        if (!dragging) { spin.rotation.y += vel * dt; vel += (AUTO - vel) * Math.min(1, dt * 1.5); }
        dirty = true;
      }
      if (dirty) {
        dirty = false;
        updateFlows(time);
        renderer.render(scene, camera);
        updateLabels();
      }
      if (!reduced) schedule();
    }
    function schedule() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero);
    else window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { visible = es[es.length - 1].isIntersecting; last = performance.now(); schedule(); }).observe(hero);
    }
    document.addEventListener('visibilitychange', () => { last = performance.now(); schedule(); });

    /* texture, then fade the canvas in (a failed load keeps the solid dark sphere) */
    const ready = () => { canvas.classList.add('is-ready'); dirty = true; schedule(); };
    new T.TextureLoader().load(assetUrl('blue_marble.jpg'), tex => {
      tex.colorSpace = T.SRGBColorSpace;
      tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      globeMat.map = tex; globeMat.color.setScalar(0.78); globeMat.needsUpdate = true;
      ready();
    }, undefined, ready);

    resize();
  }
})();
