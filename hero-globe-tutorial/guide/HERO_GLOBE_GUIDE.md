# Building an Interactive Hero Globe

**A step-by-step guide to the WebGL globe in the AI Agents for Climate Data Analysis tutorial site**

---

## Introduction

The hero section of the tutorial website features a rotating 3-D globe showing:

- The NASA Blue Marble satellite texture
- Graticule (latitude/longitude grid) lines
- Coastlines from Natural Earth data
- 15 animated ocean current paths with glowing particle tails
- Flow direction arrows that glide along each current
- Trade wind belt particles in both hemispheres
- Polar jet stream meanders
- Hover tooltips identifying any current or wind belt under the pointer
- Drag-to-rotate with momentum and auto-spin

This guide explains every technique involved, from the Three.js basics to the custom GLSL shaders, spline mathematics, and interaction model.  The companion HTML files (`01_basic_sphere.html` through `09_full_hero_section.html`) let you run each step in a browser with no build tools.

---

## Prerequisites

- **Modern browser** — Chrome 100+, Firefox 100+, or Safari 15.4+.  Requires WebGL 2 and ES module support.
- **No build step** — open each `.html` file directly by double-clicking or using a local web server.
- **Python 3.9+** — only needed for the helper scripts (`download_blue_marble.py`, `download_world_atlas.py`, `make_docx.py`).  The HTML demos work without Python.
- **Node.js** — not required for the tutorial demos.

---

## Step 1: The HTML canvas and Three.js basics

### Setting up the renderer

Three.js renders 3-D scenes to a `<canvas>` element via the WebGL API.  The entry point is `THREE.WebGLRenderer`:

```javascript
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);  // transparent background
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
```

`antialias: true` enables multi-sample anti-aliasing (MSAA), which smooths diagonal edges.  `alpha: true` lets the CSS background colour show through where nothing is drawn.  `setPixelRatio` avoids blurry rendering on Retina displays while capping at 2× to prevent GPU overload on 4× screens.

### Scene and camera

```javascript
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 2.5);
```

`PerspectiveCamera(fov, aspect, near, far)` — a 45° vertical field of view feels like a portrait-length lens.  The globe has radius 1 and sits at the origin; the camera at z = 2.5 sees it from outside.  The near/far clipping planes prevent artefacts on very close or very distant geometry.

### The animation loop

```javascript
let last = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  globe.rotation.y += 0.3 * dt;
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
```

`requestAnimationFrame` synchronises the loop to the display refresh rate (typically 60 or 120 Hz).  Multiplying by `dt` (elapsed seconds) makes the rotation rate independent of frame rate.  The cap `Math.min(0.05, ...)` prevents a jump when the tab returns from background.

---

## Step 2: Adding the Blue Marble texture

### Where the data comes from

The NASA Blue Marble Next Generation (MODIS) is a monthly composite of Moderate Resolution Imaging Spectroradiometer satellite data captured from about 700 km altitude.  Every square metre of Earth is photographed every 1–2 days; the monthly composite blends the clearest observations, removing clouds.

The image is in the **public domain** (NASA imagery licence).  The August 2004 edition (`world.200408.3x8192x4096.jpg`) is the most commonly used.  The full resolution is 8192 × 4096 pixels; for the web it is resized to 4096 × 2048.

### UV mapping and equirectangular projection

The image uses an **equirectangular** (plate carrée) projection:

| Image edge | Geographic meaning |
|---|---|
| Left (u = 0) | Longitude −180° |
| Right (u = 1) | Longitude +180° |
| Top (v = 1) | Latitude +90° (North Pole) |
| Bottom (v = 0) | Latitude −90° (South Pole) |

`THREE.SphereGeometry` assigns UV coordinates in exactly this layout, so no rotation or offset is needed.

### Loading the texture correctly

```javascript
new THREE.TextureLoader().load(textureUrl, tex => {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  globeMat.map = tex;
  globeMat.color.setScalar(0.78);
  globeMat.needsUpdate = true;
});
```

**`colorSpace = THREE.SRGBColorSpace`** is the most important setting.  JPEG files from cameras and graphics tools store colours in sRGB space (gamma ≈ 2.2).  If you leave `colorSpace` at its default, the GPU treats the values as linear, which makes the globe look washed out.  `SRGBColorSpace` tells Three.js to linearise the values internally before any blending.

**`anisotropy`** sharpens the texture when viewed at oblique angles (near the limb of the globe).  Without it, the texture blurs visibly at grazing incidence.

**`color.setScalar(0.78)`** applies a grey tint that dims the texture slightly against the dark background.

---

## Step 3: Graticule and atmosphere glow

### The ll() coordinate helper

All 3-D positions in the globe are computed from geographic coordinates with:

```javascript
const D2R = Math.PI / 180;
function ll(lat, lon, r) {
  const a = lat * D2R;
  const b = lon * D2R;
  const c = Math.cos(a) * r;
  return [
    c * Math.cos(b),    // x — east component
    Math.sin(a) * r,    // y — up (north pole = +1 when r = 1)
   -c * Math.sin(b),    // z — note the minus sign
  ];
}
```

The minus on the z component aligns with Three.js's right-hand coordinate system where −Z points into the screen.  Without it, east and west would be swapped.

### Graticule as LineSegments

```javascript
const v = [];
for (let lat = -60; lat <= 60; lat += 30) {
  for (let lon = -180; lon < 180; lon += 3) {
    v.push(...ll(lat, lon, 1.002));      // start of segment
    v.push(...ll(lat, lon + 3, 1.002)); // end of segment
  }
}
// ... longitude meridians similarly
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
const lines = new THREE.LineSegments(geo, mat);
```

`LineSegments` draws each pair of vertices as one independent segment — there is no connection between consecutive pairs.  This is more efficient than many `Line` objects.  The radius 1.002 (2 mm in globe units) keeps the lines just above the surface to avoid depth-buffer fighting.

### GLSL atmosphere — the Fresnel rim glow

The atmosphere is a custom shader that exploits the **Fresnel effect**: surfaces viewed at grazing angles (the limb of a sphere) reflect more light and appear brighter.

```glsl
// Fragment shader for the rim glow
varying vec3 vN;  // surface normal in view space
varying vec3 vP;  // fragment position in view space

void main() {
  // dot(normal, toward-camera) = 1 at the front face, 0 at the limb
  float f = 1.0 - max(0.0, dot(normalize(vN), normalize(-vP)));
  // pow tightens the glow to a thin rim; 0.75 sets peak brightness
  gl_FragColor = vec4(0.35, 0.68, 1.0, pow(f, 2.6) * 0.75);
}
```

The result is 0 at the centre of the globe (where `dot(normal, viewDir) ≈ 1`) and 1 at the limb (where `dot ≈ 0`).  `pow(f, 2.6)` sharpens the glow to a narrow band.

The outer halo uses `BackSide` rendering of a larger sphere (r = 1.2) so it appears behind the globe without sorting issues.

---

## Step 4: Loading coastlines from TopoJSON

### The TopoJSON format

TopoJSON is a compact geographic data format with three key optimisations over GeoJSON:

1. **Arc sharing** — a coast shared between two countries is stored once.
2. **Integer quantisation** — coordinates are stored as integers in a fixed grid.
3. **Delta encoding** — only the first vertex is absolute; subsequent vertices store the difference from the previous one.

A simplified TopoJSON structure:

```json
{
  "transform": {
    "scale":     [0.000003, 0.000002],
    "translate": [-180, -90]
  },
  "arcs": [
    [[x0,y0], [dx1,dy1], [dx2,dy2], ...],
    ...
  ]
}
```

### Decoding in JavaScript

```javascript
const sc = topo.transform.scale;
const tr = topo.transform.translate;

for (const arc of topo.arcs) {
  let x = 0, y = 0, prev = null;
  for (const d of arc) {
    x += d[0]; y += d[1];                        // delta sum
    const lon = x * sc[0] + tr[0];               // quantised → real lon
    const lat = y * sc[1] + tr[1];               // quantised → real lat
    const p = ll(lat, lon, 1.003);               // geo → 3-D
    if (prev) vertices.push(...prev, ...p);       // add line segment
    prev = p;
  }
}
```

The radius 1.003 places the coastlines just above the globe surface.

---

## Step 5: Ocean current paths — Catmull-Rom spline and arc-length resampling

### Why hand-drawn waypoints?

The 15 ocean current paths in this project are hand-drawn `[lat, lon]` waypoint arrays.  Real ocean current climatology data exists (OSCAR, HYCOM, AVISO), but it is complex multi-dimensional netCDF data that would require significant preprocessing.  For a tutorial website, hand-drawn paths that approximate the well-known current routes are a practical choice.  The "How to adapt this" section at the end of this guide discusses how to substitute real data.

### Catmull-Rom spline

Given four control points a, b, c, d and parameter t ∈ [0, 1], the Catmull-Rom basis gives a smooth curve through b and c:

```
CR(a,b,c,d,t) = ½ × ( 2b
                      + (c - a) t
                      + (2a - 5b + 4c - d) t²
                      + (-a + 3b - 3c + d) t³ )
```

**Key property:** the curve passes exactly through b (at t=0) and c (at t=1).  This means every waypoint lies on the curve — unlike a Bezier spline where control points are "handles" that the curve approaches but does not touch.

The implementation evaluates lat and lon independently through the same basis:

```javascript
function cr(a, b, c, d, t) {
  return 0.5 * (
    2*b + (c-a)*t + (2*a-5*b+4*c-d)*t*t + (3*b-a-3*c+d)*t*t*t
  );
}
// segment [i] uses: a=waypoint[i-1], b=waypoint[i], c=waypoint[i+1], d=waypoint[i+2]
```

### Why arc-length resampling?

The waypoints are unevenly spaced.  Tight bends near coastlines have closely packed waypoints; long ocean crossings have widely spaced ones.  If we place particles at equal parameter steps we get a crowded cluster at the bends and a sparse scattering in the open ocean.

Arc-length resampling solves this:

1. Evaluate the spline at 14 sub-steps per segment (fine polyline).
2. Measure the cumulative arc length.
3. Re-sample at equally-spaced arc-length positions.

The result is a `Float32Array` where consecutive points are physically equidistant along the curve, so particles placed at equal phase intervals appear uniformly distributed.

---

## Step 6: Animated glowing particles

### Custom point shader

Three.js `Points` renders each vertex as a billboard square.  Inside the fragment shader, `gl_PointCoord` gives the UV position within that square:

```glsl
// Fragment shader for each particle
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0; // 0 at centre, 1 at edge
  float a = pow(max(0.0, 1.0 - d), 1.8);        // soft circular glow
  gl_FragColor = vec4(vC, vA * a);               // vC=colour, vA=alpha
}
```

`AdditiveBlending` means particle colours are **added** to whatever is already in the framebuffer.  Overlapping tails sum to form a bright streak.

### The tail system

Each logical particle corresponds to `TAIL = 14` GPU points.  The head (k=0) has full brightness; each successive tail point has lower opacity:

```javascript
const tailFall = Array.from({ length: TAIL }, (_, k) =>
  k === 0 ? 1 : Math.pow(1 - k / TAIL, 1.3) * 0.9
);
```

Each frame the animation loop writes the TAIL positions:

```javascript
let s0 = (phase[p] + time * speed / pathLen) % 1;  // current head arc-fraction
for (let k = 0; k < TAIL; k++) {
  let s = s0 - k * tailStep;  // tail is behind the head
  samplePath(path, s, positions, (baseIndex + k) * 3);
  alphas[baseIndex + k] = tailFall[k] * fadeFn(s);
}
```

`samplePath` does a fast O(1) look-up: `s * m` gives an index into the resampled array, with linear interpolation between adjacent points.

### DynamicDrawUsage

```javascript
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
```

This hint tells the GPU driver to place the buffer in memory optimised for frequent updates (usually a write-combined region).  Without it, updating the positions every frame forces an expensive synchronous GPU–CPU data transfer.

---

## Step 7: Direction arrows, trade winds, and jet streams

### Arrow geometry and the cross-product orientation trick

Each arrow is a small triangle lying on the sphere surface.  We need:
- **t̂** — the tangent of the path (direction of travel)
- **ŝ** — the sideways direction in the surface plane

The sideways direction is computed as:

```javascript
// P̂ × t̂  (position unit vector cross tangent)
let sx = cy*tz - cz*ty;
let sy = cz*tx - cx*tz;
let sz = cx*ty - cy*tx;
// normalise sx,sy,sz...
```

**Why this works:** The cross product of two vectors gives a vector perpendicular to both.  `P̂` points radially outward from the globe; `t̂` lies in the surface plane.  Their cross product lies in the surface plane AND is perpendicular to `t̂` — exactly what we want for the arrow's width direction.

The three triangle vertices are:

```javascript
tip   = centre + t̂ × L × 0.6         // ahead of centre
left  = centre - t̂ × L × 0.4 + ŝ × AW  // back-left
right = centre - t̂ × L × 0.4 - ŝ × AW  // back-right
```

### Trade wind physics

Trade winds are the dominant surface-level circulation in the tropics.  The basic mechanism:

1. The Sun heats the equatorial ocean most intensely.
2. Warm air rises at the equator (ITCZ — Intertropical Convergence Zone).
3. The resulting low pressure draws air from the sub-tropics toward the equator.
4. The Coriolis effect deflects this poleward-to-equatorward flow to the right in the northern hemisphere (becoming north-east winds) and to the left in the southern hemisphere (becoming south-east winds).

The model represents each trade wind streak as a particle that:
- Starts at a random longitude and latitude in the trade wind belt (10°–24° N or S)
- Moves westward at 18°/s (in the display's time scale)
- Moves equatorward simultaneously
- Fades in at the start of its path and out at the end (sine envelope)

### Jet stream meanders (Rossby waves)

The polar jet stream is a fast westerly flow at approximately 10 km altitude (the tropopause boundary between troposphere and stratosphere).  It meanders in large waves called **Rossby waves** or **planetary waves**, driven by temperature contrasts between the tropics and the poles.

The model uses a sum of two sinusoids per meander:

```javascript
lat = 49 + dLat + 8 * Math.sin(4 * r + 0.6) + 3 * Math.sin(2 * r)
```

where `r` is the longitude in radians.  The 4-wave component (wave number 4) represents the dominant wave pattern; the 2-wave component adds some irregularity.  Three overlapping meanders (with slightly different amplitudes) create the braided appearance of the real jet stream.

---

## Step 8: Drag rotation with inertia

### The two-group rotation model

```javascript
const tilt = new THREE.Group(), spin = new THREE.Group();
tilt.add(spin); scene.add(tilt);
tilt.rotation.x = 0.3;  // slight downward tilt
```

Separating the rotations into two groups prevents gimbal lock and makes the physics intuitive: horizontal drag affects `spin.rotation.y`; vertical drag affects `tilt.rotation.x`.

### Velocity and exponential decay

```javascript
// On pointer move:
vel = clamp(dx * k / Math.max(0.008, dt), -2.5, 2.5);

// In the animation loop, after drag release:
spin.rotation.y += vel * dt;
vel += (AUTO - vel) * Math.min(1, dt * 1.5);
```

The second line is the core of the inertia: at each frame, the velocity moves 1.5 × dt of the way toward `AUTO` (the auto-spin rate).  This is exponential decay with time constant 1/1.5 ≈ 0.67 seconds.  The globe smoothly resumes auto-spin after a flick.

### Pointer Events API

```javascript
hero.addEventListener('pointerdown', e => { ... hero.setPointerCapture(e.pointerId); });
hero.addEventListener('pointermove', e => { ... });
hero.addEventListener('pointerup',   endDrag);
hero.addEventListener('pointercancel', endDrag);
```

The Pointer Events API unifies mouse, stylus (pen), and touch inputs.  `setPointerCapture` ensures that `pointermove` and `pointerup` events are delivered to the hero element even when the pointer leaves its bounds during a fast drag.

The check `if (e.pointerType === 'touch') return` in the hover handler prevents spurious tooltip triggering on touch devices where there is no "hover" state.

---

## Step 10: Hover tooltips

### Screen-space picking for ocean currents

For each ocean current, we sample its path at ~90 evenly-spaced points and project each into screen space:

```javascript
v3.fromArray(pathPos, i * 3).applyMatrix4(spin.matrixWorld);
// Skip points on the far side of the globe
if (v3.dot(camera.position) - v3.lengthSq() < 0.08) continue;
v3.project(camera);
// Convert NDC to pixel coordinates
const px = (v3.x * 0.5 + 0.5) * W;
const py = (-v3.y * 0.5 + 0.5) * H;
const dist = Math.hypot(px - pointerX, py - pointerY);
```

The far-side test `v3.dot(camera.position) - v3.lengthSq() < 0.08` is a fast scalar test: if the dot product of the point's position with the camera position is less than the point's squared distance from origin, the point is facing away from the camera and should be skipped.  Without this test, paths on the back of the globe would appear to trigger the tooltip.

### Sphere intersection for trade wind belts

If no current path is within the threshold distance, we fall back to a full sphere intersection:

```javascript
ray.setFromCamera(ndc, camera);
if (ray.ray.intersectSphere(unit, hitPoint)) {
  const lat = Math.asin(clamp(hitPoint.y / hitPoint.length(), -1, 1)) / D2R;
  if (Math.abs(lat) >= 9 && Math.abs(lat) <= 25) {
    return lat > 0 ? tradeWindsNorth : tradeWindsSouth;
  }
}
```

Converting the hit point to latitude uses the inverse of the `ll()` function: `lat = arcsin(y / r)`.

---

## Step 11: Performance and accessibility

### DynamicDrawUsage and needsUpdate

Every frame, the positions and alpha values of several thousand particles are rewritten.  Two practices keep this fast:

1. **`DynamicDrawUsage`** on the buffer attributes — hints to the GPU driver to use write-optimised memory.
2. **Setting `needsUpdate = true`** only on the attributes that actually changed — position and alpha change every frame; colour and size are set once and never change.

### IntersectionObserver and visibilitychange

```javascript
new IntersectionObserver(entries => {
  visible = entries[entries.length - 1].isIntersecting;
  last = performance.now();  // reset the dt clock to prevent a large jump
  schedule();
}).observe(hero);

document.addEventListener('visibilitychange', () => {
  last = performance.now();
  schedule();
});
```

The globe stops rendering when it is scrolled out of view or when the browser tab is hidden.  The `last = performance.now()` reset prevents a large `dt` on the first frame after returning, which would cause a visible jump.

### prefers-reduced-motion

```javascript
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const AUTO = reduced ? 0 : 0.072;
```

If the user has enabled "Reduce Motion" in their operating system accessibility settings, `AUTO` is set to 0 (no auto-spin) and `time` does not advance (particles remain stationary).  The globe still loads and displays the texture and coastlines.

### ResizeObserver

```javascript
if ('ResizeObserver' in window) {
  new ResizeObserver(resize).observe(hero);
} else {
  window.addEventListener('resize', resize);
}
```

`ResizeObserver` fires whenever the element's size changes (not just the window's).  This handles layout changes — such as the mobile TOC sliding in — that resize the hero without changing the window dimensions.

---

## Step 12: Assembling the hero section

### Z-index stacking

The hero is a `position: relative` container with four layers:

| z-index | Element | pointer-events |
|---------|---------|----------------|
| auto (behind) | `<canvas>` (globe) | none |
| auto | `.hero-vignette` (gradient) | none |
| auto | `.globe-labels` | none |
| 10 | `.globe-tip` (tooltip) | none |
| 5 | `.hero-content` (text + buttons) | auto |

The canvas has `pointer-events: none` so drag and hover events fall through to the hero `<section>` element.  The hero section itself receives all pointer events and delegates:

- Clicks on `<a>` and `<button>` elements inside `.hero-content` — handled by the browser normally.
- All other pointer events — handled by the globe interaction code.

The `isControl(e.target)` check (`e.target.closest('a, button')`) ensures that clicking a button does not start a drag.

### Camera distance formula

The camera's Z position is computed dynamically so the globe always fills a consistent fraction of the visible area regardless of the hero's aspect ratio:

```javascript
const k = Math.tan(22.5 * D2R);  // half-angle in radians (45° / 2)
const full = (H / 2) / (k * Math.sqrt(cameraZ * cameraZ - 1));
globePx = Math.min(full, W * 0.62);
camera.position.z = Math.sqrt(1 + Math.pow((H / 2) / (globePx * k), 2));
```

`sqrt(camZ² − 1)` is the distance from the camera to the tangent point of the globe, which gives the globe's projected radius at the film plane.  Solving for `camZ` given the desired `globePx` gives the formula above.

---

## How to adapt this

### Using real ocean current climatology

The hand-drawn waypoints could be replaced with real climatological data:

- **OSCAR** (Ocean Surface Current Analysis) — 5-day averages of surface current vectors at 1/3° resolution, from NOAA ERDDAP: `https://coastwatch.pfeg.noaa.gov/erddap/griddap/erdQSEKm1day`
- **HYCOM** — global Navy ocean model at 1/12° resolution, via `hycom.org`
- **Copernicus Marine Service (CMEMS)** — `marine.copernicus.eu`, multi-decadal reanalysis

To use these: download the NetCDF or JSON data, threshold by current speed to extract the dominant pathways, smooth with a Gaussian, and convert to `[lat, lon]` waypoint arrays.  The `buildPath` and `samplePath` functions work with any waypoints.

### Using real ERA5 wind data for jet streams and trade winds

ERA5 is the ECMWF 5th-generation atmospheric reanalysis, available free from the Copernicus Climate Data Store (`cds.climate.copernicus.eu`).

The `era5-download` skill in the tutorial's skill set generates the download code.  For the globe:

1. Request monthly mean 10 m u/v wind components (trade winds) and 250 hPa u/v (jet stream level).
2. Load with `xarray` and compute the climatological mean.
3. Extract streamlines along the dominant wind directions (e.g. lat bands 10°–25° for trades).
4. Convert to `[lat, lon]` waypoint arrays.

### Adding colour by SST

Sea surface temperature (SST) could be used to colour the ocean current paths:
- Warm currents (Gulf Stream, Kuroshio) in amber/red
- Cold currents (Labrador, Humboldt) in blue/cyan
- Use a diverging colour scale centred on 20°C

The `color` property in each FLOWS entry can be changed to any hex value.  To make it data-driven, map SST to a colour using a D3-style scale before building the FLOWS array.

---

*Guide written for the [AI Agents for Climate Data Analysis](https://shammun.github.io/climate-agents-tutorial/) tutorial, November 2026.*
*Author: Shammunul Islam — [github.com/shammun](https://github.com/shammun)*
