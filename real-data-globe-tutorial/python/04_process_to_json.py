"""
04_process_to_json.py
---------------------
Convert downloaded NetCDF reanalysis data into compact JSON files consumed
by the Three.js globe visualizations.

Output JSON format
------------------
winds.json / currents.json
{
  "source":    "ERA5" | "NCEP" | "GODAS",
  "year":      2023,
  "grid":      { "nlat": 181, "nlon": 360, "lat0": -90, "lon0": 0 },
  "uField":    [nlat × nlon floats, row-major, lat from -90→+90],
  "vField":    [nlat × nlon floats, row-major],
  "uMin":      float,  "uMax": float,
  "vMin":      float,  "vMax": float,
  "speedMax":  float
}

The grids are annual means bilinearly regridded to a regular 1°×1° grid.
Land/ice NaN values in ocean fields are replaced by 0.0 so the shader
can read them without branching.

Usage
-----
  python python/04_process_to_json.py --source era5   --year 2023
  python python/04_process_to_json.py --source ncep   --year 2023
  python python/04_process_to_json.py --source godas  --year 2023
"""

import argparse
import json
import pathlib
import sys

import numpy as np

try:
    import xarray as xr
except ImportError:
    print("ERROR: xarray not installed.  Run:  pip install xarray netCDF4")
    sys.exit(1)
try:
    from scipy.interpolate import RegularGridInterpolator
except ImportError:
    print("ERROR: scipy not installed.  Run:  pip install scipy")
    sys.exit(1)

# ── argument parsing ──────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(
    description="Convert NetCDF reanalysis data to JSON for the globe visualizer"
)
parser.add_argument(
    "--source", required=True,
    choices=["era5", "ncep", "godas"],
    help="Data source to process",
)
parser.add_argument("--year", type=int, default=2023)
args = parser.parse_args()

SOURCE = args.source
YEAR   = args.year

DATA_DIR = pathlib.Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# ── output target ─────────────────────────────────────────────────────────────
if SOURCE in ("era5", "ncep"):
    OUT_PATH = DATA_DIR / "winds.json"
else:
    OUT_PATH = DATA_DIR / "currents.json"

# ── target regular grid: 1° × 1°, lat −90→+90, lon 0→359 ────────────────────
TARGET_LATS = np.linspace(-90.0, 90.0, 181)   # 181 points
TARGET_LONS = np.linspace(0.0,  359.0, 360)   # 360 points

# ── helper: normalize lon to 0–360 ───────────────────────────────────────────
def norm_lon(arr: np.ndarray) -> np.ndarray:
    return arr % 360.0

# ── helper: bilinear regrid ───────────────────────────────────────────────────
def regrid(src_lat: np.ndarray, src_lon: np.ndarray,
           field: np.ndarray,
           tgt_lat: np.ndarray, tgt_lon: np.ndarray) -> np.ndarray:
    """
    Bilinearly interpolate field(src_lat, src_lon) → (tgt_lat, tgt_lon).
    Handles wrap-around in longitude by padding.
    """
    # Ensure lat is ascending
    if src_lat[0] > src_lat[-1]:
        src_lat = src_lat[::-1]
        field   = field[::-1, :]
    # Ensure lon is ascending and in [0, 360)
    src_lon = norm_lon(src_lon)
    sort_idx = np.argsort(src_lon)
    src_lon  = src_lon[sort_idx]
    field    = field[:, sort_idx]

    # Pad longitude for wrap-around interpolation
    pad       = 10
    lon_pad   = np.concatenate([src_lon[-pad:] - 360.0,
                                 src_lon,
                                 src_lon[:pad]  + 360.0])
    field_pad = np.concatenate([field[:, -pad:],
                                 field,
                                 field[:, :pad]], axis=1)

    interp = RegularGridInterpolator(
        (src_lat, lon_pad),
        field_pad,
        method="linear",
        bounds_error=False,
        fill_value=np.nan,
    )

    tgt_lat_grid, tgt_lon_grid = np.meshgrid(tgt_lat, tgt_lon, indexing="ij")
    pts = np.stack([tgt_lat_grid.ravel(), tgt_lon_grid.ravel()], axis=-1)
    return interp(pts).reshape(len(tgt_lat), len(tgt_lon))

# ── load ERA5 ─────────────────────────────────────────────────────────────────
def load_era5(year: int):
    nc_path = DATA_DIR / f"era5_winds_{year}.nc"
    if not nc_path.exists():
        print(f"ERROR: {nc_path} not found.")
        print(f"  Run:  python python/01a_download_winds_era5.py --year {year}")
        sys.exit(1)

    print(f"Loading {nc_path.name} ...")
    ds = xr.open_dataset(nc_path)

    # Variable names vary between ERA5 single-levels releases
    u_name = next((v for v in ds.data_vars if "u" in v.lower() and "10" in v), None)
    v_name = next((v for v in ds.data_vars if "v" in v.lower() and "10" in v), None)
    if u_name is None or v_name is None:
        # Fallback: take first two variables
        vars_list = list(ds.data_vars)
        u_name, v_name = vars_list[0], vars_list[1]
        print(f"  Warning: guessing u={u_name}, v={v_name}")
    else:
        print(f"  Variables: u={u_name}, v={v_name}")

    lat_name = next((c for c in ds.coords if "lat" in c.lower()), "latitude")
    lon_name = next((c for c in ds.coords if "lon" in c.lower()), "longitude")

    # Annual mean over all 12 months
    u_mean = ds[u_name].mean(dim="time").values.astype(np.float32)
    v_mean = ds[v_name].mean(dim="time").values.astype(np.float32)
    lats   = ds[lat_name].values.astype(np.float64)
    lons   = ds[lon_name].values.astype(np.float64)
    ds.close()
    return lats, lons, u_mean, v_mean, "ERA5"

# ── load NCEP ─────────────────────────────────────────────────────────────────
def load_ncep(year: int):
    u_path = DATA_DIR / f"ncep_uwnd_{year}.nc"
    v_path = DATA_DIR / f"ncep_vwnd_{year}.nc"
    for p in (u_path, v_path):
        if not p.exists():
            print(f"ERROR: {p} not found.")
            print(f"  Run:  python python/01b_download_winds_ncep.py --year {year}")
            sys.exit(1)

    print(f"Loading {u_path.name} and {v_path.name} ...")
    ds_u = xr.open_dataset(u_path)
    ds_v = xr.open_dataset(v_path)

    u_var = "uwnd" if "uwnd" in ds_u.data_vars else list(ds_u.data_vars)[0]
    v_var = "vwnd" if "vwnd" in ds_v.data_vars else list(ds_v.data_vars)[0]
    print(f"  Variables: u={u_var}, v={v_var}")

    lat_name = next((c for c in ds_u.coords if "lat" in c.lower()), "lat")
    lon_name = next((c for c in ds_u.coords if "lon" in c.lower()), "lon")

    u_mean = ds_u[u_var].mean(dim="time").values.astype(np.float32)
    v_mean = ds_v[v_var].mean(dim="time").values.astype(np.float32)
    lats   = ds_u[lat_name].values.astype(np.float64)
    lons   = ds_u[lon_name].values.astype(np.float64)
    ds_u.close()
    ds_v.close()
    return lats, lons, u_mean, v_mean, "NCEP"

# ── load GODAS ────────────────────────────────────────────────────────────────
def load_godas(year: int):
    u_path = DATA_DIR / f"godas_ucur_{year}.nc"
    v_path = DATA_DIR / f"godas_vcur_{year}.nc"
    for p in (u_path, v_path):
        if not p.exists():
            print(f"ERROR: {p} not found.")
            print(f"  Run:  python python/02_download_currents_godas.py --year {year}")
            sys.exit(1)

    print(f"Loading {u_path.name} and {v_path.name} ...")
    ds_u = xr.open_dataset(u_path)
    ds_v = xr.open_dataset(v_path)

    u_var = "ucur" if "ucur" in ds_u.data_vars else list(ds_u.data_vars)[0]
    v_var = "vcur" if "vcur" in ds_v.data_vars else list(ds_v.data_vars)[0]
    print(f"  Variables: u={u_var}, v={v_var}")

    lat_name = next((c for c in ds_u.coords if "lat" in c.lower()), "lat")
    lon_name = next((c for c in ds_u.coords if "lon" in c.lower()), "lon")

    # Surface level only (depth index 0)
    lev_dim = next((d for d in ds_u[u_var].dims
                    if d.lower() in ("level", "lev", "depth", "zlev")), None)
    if lev_dim:
        u_surf = ds_u[u_var].isel({lev_dim: 0})
        v_surf = ds_v[v_var].isel({lev_dim: 0})
        print(f"  Using surface level (index 0 of '{lev_dim}')")
    else:
        u_surf = ds_u[u_var]
        v_surf = ds_v[v_var]

    # Annual mean; convert cm/s → m/s
    u_mean = u_surf.mean(dim="time").values.astype(np.float32) / 100.0
    v_mean = v_surf.mean(dim="time").values.astype(np.float32) / 100.0
    lats   = ds_u[lat_name].values.astype(np.float64)
    lons   = ds_u[lon_name].values.astype(np.float64)
    ds_u.close()
    ds_v.close()
    return lats, lons, u_mean, v_mean, "GODAS"

# ── main processing ───────────────────────────────────────────────────────────
print(f"\nProcessing {SOURCE.upper()} data for {YEAR} ...")
print(f"Output: {OUT_PATH}\n")

if SOURCE == "era5":
    src_lat, src_lon, u_raw, v_raw, label = load_era5(YEAR)
elif SOURCE == "ncep":
    src_lat, src_lon, u_raw, v_raw, label = load_ncep(YEAR)
else:
    src_lat, src_lon, u_raw, v_raw, label = load_godas(YEAR)

print(f"  Source grid: {len(src_lat)} lats × {len(src_lon)} lons")
print(f"  u raw range: [{np.nanmin(u_raw):.3f}, {np.nanmax(u_raw):.3f}]")
print(f"  v raw range: [{np.nanmin(v_raw):.3f}, {np.nanmax(v_raw):.3f}]")
nan_pct = np.isnan(u_raw).sum() / u_raw.size * 100
print(f"  NaN fraction: {nan_pct:.1f}%")

# ── regrid to 1°×1° ──────────────────────────────────────────────────────────
print("\nRegridding to 1°×1° regular grid ...")
u_grid = regrid(src_lat, src_lon, u_raw, TARGET_LATS, TARGET_LONS)
v_grid = regrid(src_lat, src_lon, v_raw, TARGET_LATS, TARGET_LONS)
print(f"  Output grid: {u_grid.shape[0]} lats × {u_grid.shape[1]} lons")

# Replace NaN with 0.0 (land/land mask → no motion)
u_grid = np.where(np.isnan(u_grid), 0.0, u_grid)
v_grid = np.where(np.isnan(v_grid), 0.0, v_grid)

# ── statistics ────────────────────────────────────────────────────────────────
speed = np.sqrt(u_grid**2 + v_grid**2)
print(f"\n  u grid: [{u_grid.min():.4f}, {u_grid.max():.4f}]")
print(f"  v grid: [{v_grid.min():.4f}, {v_grid.max():.4f}]")
print(f"  speed:  max={speed.max():.4f} m/s, mean={speed.mean():.4f} m/s")

# ── build JSON ────────────────────────────────────────────────────────────────
print("\nSaving JSON ...")

# Round to 4 decimal places to reduce file size; speed < 0.001 m/s is irrelevant
def _round(arr, decimals=4):
    return [round(float(x), decimals) for x in arr.ravel()]

payload = {
    "source":    label,
    "year":      YEAR,
    "grid": {
        "nlat": int(len(TARGET_LATS)),
        "nlon": int(len(TARGET_LONS)),
        "lat0": float(TARGET_LATS[0]),
        "lon0": float(TARGET_LONS[0]),
    },
    "uField":   _round(u_grid),
    "vField":   _round(v_grid),
    "uMin":     round(float(u_grid.min()), 4),
    "uMax":     round(float(u_grid.max()), 4),
    "vMin":     round(float(v_grid.min()), 4),
    "vMax":     round(float(v_grid.max()), 4),
    "speedMax": round(float(speed.max()), 4),
}

OUT_PATH.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
size_kb = OUT_PATH.stat().st_size / 1024
print(f"  Saved: {OUT_PATH}  ({size_kb:.0f} KB)")
print(f"\nDone. Verify with:  python python/05_verify_json.py {OUT_PATH}")
