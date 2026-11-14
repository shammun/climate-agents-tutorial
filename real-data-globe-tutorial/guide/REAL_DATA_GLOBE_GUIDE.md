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

Downloads `uwnd.10m.gauss.<YEAR>.nc` and `vwnd.10m.gauss.<YEAR>.nc` from `https://downloads.psl.noaa.gov/Datasets/ncep.reanalysis.derived/surface_gauss/`. These are on a T62 Gaussian grid (192 × 94 points). The processing script handles the regridding.

Output: `data/ncep_uwnd_<YEAR>.nc` and `data/ncep_vwnd_<YEAR>.nc`
Typical size: ~5 MB each.

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
4. For GODAS: selects level index 0 (surface) and converts cm/s to m/s.
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

### Coordinate system

Three.js uses a right-handed coordinate system with y pointing up. A point on the globe at latitude φ and longitude λ is placed at:

```
x = R · sin(φ') · cos(λ')
y = R · cos(φ')
z = R · sin(φ') · sin(λ')
```

where `φ' = (90 − lat) × π/180` (colatitude) and `λ' = lon × π/180`.

The globe sphere (`SphereGeometry`) is centred at the origin with radius `R = 1.0`. Particles are placed at `R + ε` (a tiny offset above the surface, 0.001–0.0025) so they are not hidden inside the sphere geometry.

### Particle advection

Each particle stores its current latitude and longitude in a flat `Float32Array`. Every animation frame (`requestAnimationFrame`), the step function:

1. Looks up the u and v values at the particle's (lat, lon) using bilinear interpolation.
2. Converts the velocity to degrees per step:
   - `Δlat = v × DT × speedScale`
   - `Δlon = u × DT × speedScale / cos(lat)` — the cosine term corrects for the shrinking of longitude degrees near the poles.
3. Updates the particle's position, wraps longitude to [0, 360), and reseeds if the particle goes out of bounds.
4. Converts the new (lat, lon) to Cartesian (x, y, z) and writes it into the BufferGeometry's `position` attribute.
5. Computes a colour from the wind/current speed at that cell and writes it to the `color` attribute.
6. After processing all particles, sets `attribute.needsUpdate = true` to upload the new buffer to the GPU.

**DT tuning:** `DT = 0.08` means a 10 m/s wind moves a particle 0.8° per frame at 60 fps. At the equator that is about 89 km per frame — visually fast but not excessive. Reduce DT for a more realistic (slower) animation or increase `speedScale` for emphasis.

**Age and fade:** Each particle has an `age` counter. When `age > maxAge` (120–160 frames), the particle is reseeded at a random location. The colour is multiplied by `fade = 1 − age/maxAge`, so particles fade out as they age rather than abruptly disappearing.

### BufferGeometry updates

Three.js keeps geometry on the GPU. To update positions every frame:

1. Store a reference to the BufferAttribute returned by `geo.getAttribute('position')`.
2. Call `attribute.setXYZ(i, x, y, z)` for each particle that moved.
3. Set `attribute.needsUpdate = true` after the loop.

This is more efficient than rebuilding the geometry each frame, but it still uploads the entire buffer to the GPU every frame (Three.js does not support partial uploads in this API). For 800–1000 particles the upload is ~10 µs and invisible in the frame budget. Beyond ~5000 particles consider a custom shader.

### Globe rotation

The globe rotation is driven by the `rot.x` and `rot.y` variables, which are updated by mouse drag and touch events. Both the globe mesh and the particle mesh are assigned the same rotation, keeping them synchronised:

```js
globe.rotation.x = rot.x;
globe.rotation.y = rot.y;
pMesh.rotation.x = rot.x;
pMesh.rotation.y = rot.y;
```

A more sophisticated implementation would apply the rotation as a quaternion to avoid gimbal lock and enable inertial spinning after a drag, but for a tutorial the simpler approach is clear and sufficient.

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

### Add a land mask texture

To make the ocean/land distinction visible on the globe sphere, load a texture from a public CDN:

```js
const loader  = new THREE.TextureLoader();
const texture = loader.load('https://unpkg.com/three-globe@2.31.0/example/img/earth-dark.jpg');
globeMat.map = texture;
globeMat.needsUpdate = true;
```

This replaces the flat dark colour with a realistic shaded-relief map. Because the texture loads asynchronously, the globe renders in its fallback colour until the image arrives.

### Colour by direction instead of speed

Replace the `speedColor` function with one that maps the wind angle to a hue:

```js
function directionColor(u, v) {
  const angle = Math.atan2(v, u);           // −π to +π
  const hue   = (angle / (2 * Math.PI) + 0.5) % 1;
  const c     = new THREE.Color();
  c.setHSL(hue, 0.9, 0.55);
  return c;
}
```

This makes westerlies, trade winds, and monsoon flows visible as distinct colour bands.

### GPU particle shader

For 10 000+ particles, a custom vertex shader eliminates the per-frame CPU→GPU upload. The shader reads the velocity field from a data texture (a `DataTexture` initialized from the u/v arrays), advects each particle in the vertex stage, and outputs both position and colour. This is significantly more complex to implement but can handle millions of particles at 60 fps.

A good starting point is the Three.js `GPUComputationRenderer` example, which uses ping-pong render targets to store particle state between frames entirely on the GPU.

### Switching between multiple years

Generate a JSON file for each year and add a year selector to the UI:

```js
async function loadYear(year) {
  const data = await fetch(`../data/winds_${year}.json`).then(r => r.json());
  uField   = data.uField;
  vField   = data.vField;
  speedMax = data.speedMax;
}
```

Comparing ERA5 annual means across years makes multi-decadal wind shifts visible — for example, the strengthening of the Southern Ocean westerlies since the 1980s.

---

## Part 5 — Common issues and fixes

### "Failed to fetch" or CORS error

The HTML files use `fetch()` to load the JSON files. Browsers block `fetch()` on `file://` URLs for security reasons. You must serve the files over HTTP:

```bash
# From the real-data-globe-tutorial/ directory:
python -m http.server 8080
# Then open http://localhost:8080/html/01_wind_globe.html
```

### Globe loads but particles do not appear

1. Open the browser developer console (F12 → Console tab).
2. If you see `Failed to fetch ../data/winds.json` → the JSON file has not been generated yet. Run `04_process_to_json.py`.
3. If you see a JSON parse error → the JSON file is corrupted or truncated. Re-run `04_process_to_json.py`.
4. If no errors → run `05_verify_json.py` to check for all-zero fields.

### All particles are stuck at the equator or the poles

This means the velocity field is correct at the grid level but the lat→index mapping is wrong. Check that the JSON `grid.lat0` is `−90.0` (south pole) and `grid.nlat` is `181`. The index formula is:

```
latIndex = (lat + 90) / 180 * 180   # gives 0 at −90°, 180 at +90°
```

If `lat0` were `+90` (north pole) instead, the formula would need to be `(90 − lat) / 180 * 180`.

### Particles only appear over ocean (currents file) or only over land (wind file)

GODAS data is ocean-only; grid cells over land have values of 0 (they were NaN in the NetCDF, replaced with 0 by the processing script). The step function in `02_current_globe.html` reseeds particles that land on a zero-speed cell after 5 steps, so wind particles naturally migrate to ocean regions. If you want particles in both regions, use the wind file for the current visualization too.

### Speed looks too slow or too fast

Adjust the `DT` constant in the HTML file. `DT = 0.08` is calibrated for wind speeds in m/s. Ocean currents are typically 10–50× slower than wind speeds (0.05–1 m/s vs. 1–15 m/s), but the GODAS file already converts cm/s → m/s, so the same DT value will make ocean particles appear much slower. Increase `DT` or the default `speedScale` in `02_current_globe.html` to compensate.

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
