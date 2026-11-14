# Real-Data Globe Guide

A step-by-step walkthrough for animating actual climate reanalysis data as particle trails on an interactive Three.js globe.

---

## Overview

The tutorial uses two real datasets:

| Dataset | Variable | Resolution | Source |
|---|---|---|---|
| ERA5 (or NCEP fallback) | 10 m zonal (u) and meridional (v) wind | 0.25° × 0.25° (ERA5) or T62 Gaussian (~1.9°) | Copernicus CDS / NOAA PSL |
| GODAS | Surface ocean current u and v | ~1° × 0.33° | NOAA PSL |

The Python pipeline downloads the files, computes annual means, regrids them to a uniform 1°×1° grid, and writes compact JSON arrays that the browser fetches at runtime. Each particle's lat/lon is advected forward one step per animation frame using bilinear interpolation of the velocity field.

---

## Part 1 — Data sources and API setup

### ERA5 (requires free registration)

ERA5 is ECMWF's fifth-generation global atmospheric reanalysis. It provides hourly and monthly-mean data from 1940 to near-present at 0.25° resolution — far higher quality than the NCEP fallback.

**Setup steps (one-time):**

1. Register at [cds.climate.copernicus.eu](https://cds.climate.copernicus.eu) (free account).
2. After logging in, go to your profile page and copy your API key (a string like `12345:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).
3. Create the file `~/.cdsapirc` (Linux/Mac) or `C:\Users\<you>\.cdsapirc` (Windows) with exactly these two lines:

```
url: https://cds.climate.copernicus.eu/api
key: YOUR_UID:YOUR_API_KEY
```

4. Run `python python/00_check_setup.py` to confirm the key is found.

### NCEP/NCAR Reanalysis 1 (no key required)

The NCEP/NCAR Reanalysis 1 is a coarser but freely accessible dataset hosted on NOAA PSL's public HTTP server. The download script (`01b_download_winds_ncep.py`) fetches files directly — no account needed. Use this if you do not want to register with Copernicus.

**Trade-off:** ERA5 has 4× higher spatial resolution and better quality over oceans, polar regions, and the upper atmosphere. For a globe visualization the difference is visually subtle. Use NCEP if you want to get started immediately.

### GODAS (no key required)

The Global Ocean Data Assimilation System (GODAS) is NOAA's operational ocean reanalysis. It provides monthly temperature, salinity, and current velocity on a near-global ocean grid (5°S–65°N latitude). Files are hosted on NOAA PSL's public HTTP server.

**Key limitation:** GODAS only covers 65°N–5°S (roughly Arctic to Antarctic, excluding polar regions). Particles that reach the boundary will be reseeded. This is realistic — GODAS has no data beyond those latitudes.

---

## Part 2 — What the Python scripts do

### `00_check_setup.py`

Checks Python version, all required packages, the CDS API key, the data directory, and whether Three.js is installed in `node_modules/`. Run this first; it will tell you exactly what is missing and how to fix it.

### `01a_download_winds_era5.py`

Submits a CDS API request for the dataset `reanalysis-era5-single-levels-monthly-means`, asking for variables `10m_u_component_of_wind` and `10m_v_component_of_wind`, all 12 months of the requested year, in NetCDF format. The request is queued server-side — CDS may take a few minutes before the download starts.

Output: `data/era5_winds_<YEAR>.nc`
Typical size: 50–200 MB depending on the year and grid.

### `01b_download_winds_ncep.py`

Downloads `uwnd.10m.gauss.<YEAR>.nc` and `vwnd.10m.gauss.<YEAR>.nc` from `https://downloads.psl.noaa.gov/Datasets/ncep.reanalysis/surface_gauss/`. Each file holds one year of 6-hourly values on a T62 Gaussian grid (192 × 94 points). The processing script averages over time and handles the regridding.

Output: `data/ncep_uwnd_<YEAR>.nc` and `data/ncep_vwnd_<YEAR>.nc`
Typical size: ~50 MB each.

### `02_download_currents_godas.py`

Downloads `ucur.<YEAR>.nc` and `vcur.<YEAR>.nc` from `https://downloads.psl.noaa.gov/Datasets/godas/`. These files have dimensions `(time=12, level=40, lat=418, lon=360)`. Level index 0 corresponds to the shallowest depth (~5 m). The script confirms the level coordinate values after download.

Output: `data/godas_ucur_<YEAR>.nc` and `data/godas_vcur_<YEAR>.nc`
Typical size: ~100 MB each.

### `03_inspect_netcdf.py`

Prints a formatted summary of any NetCDF file — dimensions, coordinate ranges, variable statistics, and an ASCII map — and saves a matplotlib PNG. This is a diagnostic tool; it is not part of the processing pipeline. Use it to understand the structure of a downloaded file or to diagnose unexpected values.

### `04_process_to_json.py`

The main conversion step. For each source it:

1. Opens the NetCDF file(s) with xarray.
2. Computes the annual mean over all 12 monthly time steps.
3. Extracts the u and v arrays and their lat/lon coordinates.
4. For GODAS: selects level index 0 (surface, 5 m depth) and reads the `units` attribute; current files on NOAA PSL are already in m/s, older copies in cm/s are divided by 100.
5. Regrids both fields to a uniform 1°×1° grid (181 latitudes × 360 longitudes) using `scipy.interpolate.RegularGridInterpolator` with bilinear interpolation and longitude wrap-around padding.
6. Replaces NaN values (land mask) with 0.0 so the browser can read the flat array without branching.
7. Writes the result as a compact JSON file.

**Regridding explained:**

ERA5's native grid (0.25°) has more points than the target 1°. The regridding downsamples it, which is fine — we lose sub-grid detail but keep the large-scale patterns. NCEP's T62 Gaussian grid has ~1.9° spacing, so the regrid slightly upsamples it. Neither change affects the visual quality of the particle animation.

The RegularGridInterpolator requires the input grid to be sorted (ascending latitude, ascending longitude). For ERA5 latitudes run 90→−90 (descending), so the script reverses them. Longitudes may run 0→360 or −180→180 depending on the source; the script normalizes them to 0–360 before sorting.

**JSON output format:**

```json
{
  "source":    "ERA5",
  "year":      2023,
  "grid":      { "nlat": 181, "nlon": 360, "lat0": -90.0, "lon0": 0.0 },
  "uField":    [65160 floats, lat-major order],
  "vField":    [65160 floats],
  "uMin": -15.2, "uMax": 18.4,
  "vMin":  -9.1, "vMax": 10.3,
  "speedMax":  21.6
}
```

The flat array is indexed as `uField[latIndex * 360 + lonIndex]`, where `latIndex = 0` corresponds to 90°S and `latIndex = 180` to 90°N.

### `05_verify_json.py`

Checks the JSON file for required keys, correct array lengths, the absence of NaN values, and physically plausible speed values. It prints an ASCII map of the speed field and optionally saves a three-panel matplotlib figure (u, v, speed). Run this after `04_process_to_json.py` to confirm the data looks right before opening the browser.

---

## Part 3 — How the visualization works

### Files in `html/`

| File | Role |
|---|---|
| `three.global.min.js` | Three.js r168 as a plain script (sets `window.THREE`) |
| `blue_marble.js` | NASA Blue Marble Earth image embedded as a data URL (`window.BLUE_MARBLE_DATA_URL`) |
| `flow_globe.js` | The shared code: globe, drag/zoom, field sampling, particle trails (`window.FlowGlobe`) |
| `01_…`, `02_…`, `03_…` | Pages: each creates a globe and one or two flow layers with its own settings |

A page needs only a few lines:

```js
const globe = FlowGlobe.createGlobe({ canvas, textureUrl: window.BLUE_MARBLE_DATA_URL });
FlowGlobe.loadData('WIND_DATA', '../data/winds.json').then(data => {
  const layer = FlowGlobe.createFlowLayer(globe, data, { count: 3000, degPerMs: 0.06 });
  globe.onFrame(() => layer.step(1));
});
```

### Coordinate system

Three.js uses a right-handed coordinate system with y pointing up. A point at latitude φ and longitude λ is placed at:

```
x =  R · cos(φ) · cos(λ)
y =  R · sin(φ)
z = −R · cos(φ) · sin(λ)
```

The minus sign on z is required to match how `THREE.SphereGeometry` wraps an equirectangular image (longitude −180° at the left edge). With `+sin(λ)` the particles would be mirrored east–west relative to the continents on the texture.

The Earth sphere has radius `R = 1.0`. Trails are drawn slightly above it (`radius` 1.003 for currents, 1.006–1.008 for winds) so the sphere does not hide them. The sphere and all flow layers sit in one `THREE.Group`, so dragging rotates them together.

### Particle advection

Each particle stores its latitude and longitude. Every animation frame (`requestAnimationFrame`), `step()`:

1. Looks up u and v at the particle's (lat, lon) using bilinear interpolation of the 1° grid (longitude wraps around).
2. Converts the velocity to degrees per frame:
   - `Δlat = v × k`
   - `Δlon = u × k / cos(lat)` — the cosine term corrects for longitude degrees shrinking towards the poles
   - `k = degPerMs × speedScale × speed^(speedExponent − 1)`. With `speedExponent = 1` the step is proportional to the speed. The currents page uses `0.5`, which makes the step grow with √speed, so slow gyre currents (a few cm/s) still leave visible streaks. The colour still shows the true speed.
3. Caps the step at `maxStep` degrees, so the fastest jets do not jump across the globe.
4. Respawns the particle at a random place when it gets too old, reaches a pole, or (currents only) drifts onto land.

**Speed settings:** winds use `degPerMs = 0.06`, so a 10 m/s wind moves 0.6° per frame. Currents use `degPerMs = 0.8` with `speedExponent = 0.5`, so 0.1 m/s → 0.25° per frame and 0.5 m/s → 0.57° per frame. The **Faster** and **Slower** buttons multiply all of these by `speedScale`.

**Spawning:** new particles are placed uniformly by area (`lat = asin(2·rand − 1)`). For currents, `minSpeed = 0.02` makes the spawn function retry until it finds a point where the current is at least 2 cm/s. GODAS land cells are 0, so particles start in the ocean.

### Trails

Each particle remembers its last `trail` positions (12–20) in a history buffer, newest first. Each frame the history is shifted by one slot (`copyWithin`) and the new position is written at the front. The trail is drawn as `trail − 1` line segments with `THREE.LineSegments`:

- **Colour:** taken from the palette at the particle's current speed.
- **Brightness:** fades from the head (1) to the tail (0), and also fades in over a particle's first 10 frames and out over its last 15.
- **Blending:** `AdditiveBlending`. Black adds nothing, so faded segments disappear, and overlapping trails in strong flows glow brighter.

When a particle respawns, its whole history is set to the new point. Without this, a line would be drawn from the old position to the new one, right across the globe.

### BufferGeometry updates

All trails of a layer are stored in one `BufferGeometry` with `position` and `color` attributes. The step function writes the new values into the attribute arrays and sets `needsUpdate = true`, which uploads both buffers to the GPU once per frame. For 3000 particles × 15 segments this takes under 2 ms on a laptop. For 50 000+ particles, consider a GPU shader (see Part 4).

### Globe rotation

`createGlobe` keeps the rotation in `rot.x` (tilt) and `rot.y` (spin), updated by pointer events (mouse, pen and touch) and applied to the Earth group every frame. `view: { lat, lon }` sets which point faces the camera at the start and after **Reset view**. A point at longitude λ sits at angle −λ around the y axis, and the camera looks at angle 90°, so `rot.y = −(90° + λ)` and `rot.x = lat`.

---

## Part 4 — Extending the tutorial

### Animate a specific season or month

The JSON files currently contain the annual mean. To animate a single month, change `04_process_to_json.py` to select one time index instead of averaging over all 12:

```python
# Instead of:
u_mean = ds[u_name].mean(dim="time").values

# Select January (index 0):
u_mean = ds[u_name].isel(time=0).values
```

You could then generate 12 JSON files and load them one at a time in the browser to create a seasonal cycle animation.

### Use a different Earth texture

The pages pass `window.BLUE_MARBLE_DATA_URL` (from `blue_marble.js`) to `createGlobe({ textureUrl })`. An image is embedded as a data URL because browsers refuse to use a separate image file as a WebGL texture on a page opened from disk. When the pages are served over HTTP, any image URL works, for example `textureUrl: '../my_texture.jpg'`. `dimTexture` (default 0.55) darkens the image so that the trails stay readable on top of it.

### Change the colours

The palettes are lists of `[t, r, g, b]` stops in `FlowGlobe.PALETTES`. Pass your own with `palette: [...]`. `colourMax` sets the speed that maps to the last colour, and `colourGamma < 1` spreads out the low speeds.

### GPU particle shader

For 10 000+ particles, a custom vertex shader eliminates the per-frame CPU→GPU upload. The shader reads the velocity field from a data texture (a `DataTexture` initialized from the u/v arrays), advects each particle in the vertex stage, and outputs both position and colour. This is significantly more complex to implement but can handle millions of particles at 60 fps.

A good starting point is the Three.js `GPUComputationRenderer` example, which uses ping-pong render targets to store particle state between frames entirely on the GPU.

### Switching between multiple years

Generate a JSON file for each year and add a year selector to the UI:

```js
let layer;
async function loadYear(year) {
  const data = await fetch(`../data/winds_${year}.json`).then(r => r.json());
  if (layer) layer.visible = false;          // hide the old layer
  layer = FlowGlobe.createFlowLayer(globe, data, { count: 3000, degPerMs: 0.06 });
}
```

(`fetch` needs the pages to be served over HTTP; from `file://` write one `.js` file per year instead, as `04_process_to_json.py` does.)

Comparing ERA5 annual means across years makes multi-decadal wind shifts visible — for example, the strengthening of the Southern Ocean westerlies since the 1980s.

---

## Part 5 — Common issues and fixes

### Opening the pages: double-click or a local server

Browsers refuse to load ES module files, `fetch()` JSON, or use image files in WebGL when a page is opened straight from disk (`file://`). The pages avoid all three so that double-clicking works:

- Three.js is loaded as a plain script, `html/three.global.min.js` (built from the npm package by `tools/make_three_global.mjs`).
- `04_process_to_json.py` writes each dataset twice: `winds.json` and `winds.js` (the same data as `window.WIND_DATA = {...}`). The pages load the `.js` file with a `<script>` tag and only fall back to `fetch()` of the `.json` file when served over HTTP.

Serving over HTTP also works if you prefer it:

```bash
# From the real-data-globe-tutorial/ directory:
python -m http.server 8080
# Then open http://localhost:8080/html/01_wind_globe.html
```

### Globe loads but particles do not appear

1. Open the browser developer console (F12 → Console tab).
2. If the top bar says `no data yet: run python/04_process_to_json.py` → the data files have not been generated yet. Run `04_process_to_json.py`.
3. If you see a JSON parse error → the JSON file is corrupted or truncated. Re-run `04_process_to_json.py`.
4. If no errors → run `05_verify_json.py` to check for all-zero fields.

### All particles are stuck at the equator or the poles

This means the velocity field is correct at the grid level but the lat→index mapping is wrong. Check that the JSON `grid.lat0` is `−90.0` (south pole) and `grid.nlat` is `181`. The index formula is:

```
latIndex = (lat + 90) / 180 * 180   # gives 0 at −90°, 180 at +90°
```

If `lat0` were `+90` (north pole) instead, the formula would need to be `(90 − lat) / 180 * 180`.

### Particles only appear over ocean (currents file) or only over land (wind file)

This is expected for currents. GODAS data covers only the ocean: land cells were NaN in the NetCDF, and the processing script sets them to 0. The currents layer uses `minSpeed: 0.02`, so particles are only spawned where the current is at least 2 cm/s, and are respawned when they drift into slower water or onto land. Wind particles cover the whole globe because `minSpeed` is 0 for winds.

### Speed looks too slow or too fast

Use the **Faster**/**Slower** buttons, or change `degPerMs` in the page's `createFlowLayer` call. Winds use 0.06. Currents use 0.8 with `speedExponent: 0.5`, because ocean currents are 10–100× slower than winds (0.02–1 m/s vs. 1–15 m/s). If currents look 100× too slow, check the processing output: it prints the units it found in the GODAS file. Current NOAA PSL files are in m/s, older copies in cm/s.

### CDS download is queued for more than 30 minutes

The Copernicus CDS server queues requests during peak hours. The `cdsapi.Client()` will continue polling until the download starts. If you close the terminal, the job is cancelled. Leave it running. As an alternative, download via the CDS web interface: log in, navigate to ERA5 Single Levels Monthly Means, select the variables, format, and year, and download the `.nc` file manually.

---

## References

- ERA5 documentation: [https://confluence.ecmwf.int/display/CKB/ERA5](https://confluence.ecmwf.int/display/CKB/ERA5)
- GODAS dataset description: [https://www.cpc.ncep.noaa.gov/products/GODAS/](https://www.cpc.ncep.noaa.gov/products/GODAS/)
- NCEP/NCAR Reanalysis 1 at NOAA PSL: [https://psl.noaa.gov/data/gridded/data.ncep.reanalysis.derived.html](https://psl.noaa.gov/data/gridded/data.ncep.reanalysis.derived.html)
- Three.js BufferGeometry documentation: [https://threejs.org/docs/#api/en/core/BufferGeometry](https://threejs.org/docs/#api/en/core/BufferGeometry)
- xarray user guide: [https://docs.xarray.dev/en/stable/](https://docs.xarray.dev/en/stable/)
- SciPy RegularGridInterpolator: [https://docs.scipy.org/doc/scipy/reference/generated/scipy.interpolate.RegularGridInterpolator.html](https://docs.scipy.org/doc/scipy/reference/generated/scipy.interpolate.RegularGridInterpolator.html)
