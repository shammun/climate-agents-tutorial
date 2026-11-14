/* Theme toggle */
(function () {
  const root = document.documentElement;
  const btn = document.getElementById('themeBtn');
  const stored = (() => { try { return localStorage.getItem('theme'); } catch { return null; } })();
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = stored || (prefersDark ? 'dark' : 'light');
  if (initial === 'dark') root.setAttribute('data-theme', 'dark');

  btn && btn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch {}
  });
})();

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
  const REPO = document.documentElement.dataset.repo || '';
  document.addEventListener('click', e => {
    if (e.target.classList.contains('btn-dl')) {
      const path = e.target.dataset.path;
      if (!path || !REPO) return;
      const url = REPO.replace(/\/$/, '') + '/raw/refs/heads/main/climate-agent-template/' + path;
      const a = document.createElement('a');
      a.href = url; a.download = path.split('/').pop(); a.click();
    }
    if (e.target.id === 'zipBtn' || e.target.closest('#zipBtn')) {
      const base = document.querySelector('base')?.href || location.origin + location.pathname.replace(/[^/]*$/, '');
      const a = document.createElement('a');
      a.href = base + 'downloads/climate-agent-template.zip';
      a.download = 'climate-agent-template.zip'; a.click();
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

/* Three.js animated hero scene */
(function initHeroScene() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof THREE === 'undefined') return;
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  try {
    const scene = new THREE.Scene();
    const hero = canvas.parentElement;
    const W = hero.clientWidth, H = hero.clientHeight;
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.z = 9;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    scene.add(new THREE.AmbientLight(0x112233, 1));
    const pt = new THREE.PointLight(0x2dd4bf, 2, 20);
    scene.add(pt);

    const group = new THREE.Group();
    scene.add(group);

    const sphereGeo = new THREE.SphereGeometry(0.22, 16, 16);

    /* center node */
    const centerMat = new THREE.MeshStandardMaterial({ color: 0x0891b2, emissive: 0x0891b2, emissiveIntensity: 0.7 });
    const center = new THREE.Mesh(sphereGeo, centerMat);
    group.add(center);

    /* 5 outer nodes */
    const outerMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, emissive: 0x0d9488, emissiveIntensity: 0.6 });
    const R = 3;
    const nodes = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const mesh = new THREE.Mesh(sphereGeo, outerMat);
      mesh.position.set(Math.cos(angle) * R, Math.sin(angle) * R, 0);
      group.add(mesh);
      nodes.push(mesh.position.clone());
    }

    /* edges */
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.3 });
    nodes.forEach(pos => {
      const pts = [new THREE.Vector3(0, 0, 0), pos.clone()];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      group.add(new THREE.Line(geo, edgeMat));
    });

    /* particles: 8 per edge, staggered */
    const particleMat = new THREE.PointsMaterial({ color: 0x2dd4bf, size: 0.09, transparent: true, opacity: 0.85 });
    const pGroups = nodes.map((endPos, ei) => {
      const count = 8;
      const positions = new Float32Array(count * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const pts = new THREE.Points(geo, particleMat);
      group.add(pts);
      return { geo, endPos: endPos.clone(), count, offset: ei / 5 };
    });

    let frame = 0;
    function animate() {
      requestAnimationFrame(animate);
      frame++;
      group.rotation.y += 0.003;
      pt.position.set(Math.sin(frame * 0.01) * 3, Math.cos(frame * 0.013) * 2, 2);

      pGroups.forEach(({ geo, endPos, count, offset }) => {
        const pos = geo.attributes.position.array;
        for (let i = 0; i < count; i++) {
          const t = ((frame * 0.008 + offset + i / count) % 1);
          pos[i * 3]     = endPos.x * t;
          pos[i * 3 + 1] = endPos.y * t;
          pos[i * 3 + 2] = endPos.z * t;
        }
        geo.attributes.position.needsUpdate = true;
      });

      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      const nW = hero.clientWidth, nH = hero.clientHeight;
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
    });

  } catch (e) {
    /* Three.js unavailable or failed — canvas stays blank, page works fine */
  }
})();
