"""
03_inspect_netcdf.py
--------------------
Print a detailed summary of any NetCDF file — variable names, dimensions,
coordinate ranges, units — and optionally save a quick matplotlib plot.

Usage:
    python python/03_inspect_netcdf.py data/era5_winds_2023.nc
    python python/03_inspect_netcdf.py data/godas_ucur_2023.nc
"""

import argparse
import pathlib
import sys

try:
    import xarray as xr
    import numpy as np
except ImportError:
    print("ERROR: xarray and numpy required. Run:  pip install xarray numpy netCDF4")
    sys.exit(1)

# ── arguments ─────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="Inspect a NetCDF file")
parser.add_argument("file", help="Path to .nc file")
parser.add_argument("--no-plot", action="store_true",
                    help="Skip matplotlib plot even if matplotlib is available")
args = parser.parse_args()

nc_path = pathlib.Path(args.file)
if not nc_path.exists():
    print(f"ERROR: File not found: {nc_path}")
    sys.exit(1)

data_dir = nc_path.parent

# ── open file ─────────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"FILE: {nc_path}")
print(f"SIZE: {nc_path.stat().st_size / 1e6:.2f} MB")
print(f"{'='*60}")

ds = xr.open_dataset(nc_path, decode_times=True)

# ── global attributes ─────────────────────────────────────────────────────────
print("\n── Global attributes ──────────────────────────────────────")
for attr, val in ds.attrs.items():
    val_str = str(val)[:80]
    print(f"  {attr:20s} = {val_str}")

# ── dimensions ────────────────────────────────────────────────────────────────
print("\n── Dimensions ─────────────────────────────────────────────")
for dim, size in ds.dims.items():
    print(f"  {dim:20s} = {size}")

# ── coordinates ───────────────────────────────────────────────────────────────
print("\n── Coordinates ────────────────────────────────────────────")
for name, coord in ds.coords.items():
    vals   = coord.values
    units  = coord.attrs.get("units", "")
    if vals.ndim == 1 and len(vals) > 1:
        print(f"  {name:20s}  [{vals.min():.3f} → {vals.max():.3f}]  "
              f"n={len(vals)}  units={units or '?'}")
    else:
        print(f"  {name:20s}  dtype={coord.dtype}  units={units or '?'}")

# ── variables ─────────────────────────────────────────────────────────────────
print("\n── Data variables ─────────────────────────────────────────")
for var in ds.data_vars:
    v     = ds[var]
    units = v.attrs.get("units", "?")
    lname = v.attrs.get("long_name", "")
    dims  = " × ".join(f"{d}={s}" for d, s in zip(v.dims, v.shape))
    arr   = v.values
    valid = arr[~np.isnan(arr)]
    stats = (f"min={valid.min():.4f}  max={valid.max():.4f}  "
             f"mean={valid.mean():.4f}") if valid.size > 0 else "all NaN"
    print(f"\n  Variable : {var}")
    print(f"  Long name: {lname}")
    print(f"  Shape    : ({dims})")
    print(f"  Units    : {units}")
    print(f"  Stats    : {stats}")
    nan_frac = np.isnan(arr).sum() / arr.size * 100
    print(f"  NaN frac : {nan_frac:.1f}% (land mask / missing data)")

# ── time range ────────────────────────────────────────────────────────────────
if "time" in ds.coords:
    times = ds.coords["time"].values
    print(f"\n── Time range ─────────────────────────────────────────────")
    print(f"  First : {str(times[0])[:19]}")
    print(f"  Last  : {str(times[-1])[:19]}")
    print(f"  Steps : {len(times)}")

# ── ASCII map of first variable ───────────────────────────────────────────────
print("\n── ASCII coverage map (first variable, first time step) ──")
first_var = list(ds.data_vars)[0]
v = ds[first_var]

# Select first time step and (if present) first level
sel = v.isel(time=0) if "time" in v.dims else v
for lev_name in ("level", "lev", "depth", "zlev"):
    if lev_name in sel.dims:
        sel = sel.isel({lev_name: 0})
        print(f"  (using surface level index 0 for depth dimension '{lev_name}')")
        break

# Need lat and lon dimensions
lat_dim = next((d for d in sel.dims if "lat" in d.lower()), None)
lon_dim = next((d for d in sel.dims if "lon" in d.lower()), None)
if lat_dim and lon_dim:
    # Coarsen to ~72×36 for ASCII display
    ny, nx = sel.shape if sel.dims[0] == lat_dim else (sel.shape[1], sel.shape[0])
    arr = sel.values
    if arr.ndim == 2:
        rows, cols = 18, 36
        arr_c = arr if sel.dims[0] == lat_dim else arr.T
        # Downsample
        step_r = max(1, arr_c.shape[0] // rows)
        step_c = max(1, arr_c.shape[1] // cols)
        thumb  = arr_c[::step_r, ::step_c]
        # Normalize for ASCII
        valid = thumb[~np.isnan(thumb)]
        if valid.size > 0:
            lo, hi = valid.min(), valid.max()
            chars  = " ·:-=+*#%@"
            print(f"  {'─'*(thumb.shape[1]+2)}")
            for row in thumb:
                line = "|"
                for val in row:
                    if np.isnan(val):
                        line += " "
                    elif hi > lo:
                        idx = int((val - lo) / (hi - lo) * (len(chars) - 1))
                        line += chars[idx]
                    else:
                        line += "·"
                line += "|"
                print(f"  {line}")
            print(f"  {'─'*(thumb.shape[1]+2)}")
            print(f"  '{chars[0]}' = {lo:.2f}  '{chars[-1]}' = {hi:.2f}  ({v.attrs.get('units','?')})")

# ── optional matplotlib plot ──────────────────────────────────────────────────
if not args.no_plot:
    try:
        import matplotlib.pyplot as plt
        import matplotlib.colors as mcolors

        fig, axes = plt.subplots(1, min(2, len(ds.data_vars)),
                                  figsize=(12, 5), squeeze=False)
        for idx, var in enumerate(list(ds.data_vars)[:2]):
            v   = ds[var]
            sel = v.isel(time=0) if "time" in v.dims else v
            for lev_name in ("level", "lev", "depth", "zlev"):
                if lev_name in sel.dims:
                    sel = sel.isel({lev_name: 0})
                    break
            ax = axes[0, idx]
            vmax = float(np.nanpercentile(np.abs(sel.values), 99))
            im = ax.imshow(sel.values, origin="upper",
                           cmap="RdBu_r", vmin=-vmax, vmax=vmax,
                           aspect="auto")
            ax.set_title(f"{var}  ({v.attrs.get('units','?')})\ntime[0]", fontsize=10)
            plt.colorbar(im, ax=ax, shrink=0.7)

        plt.suptitle(nc_path.name, fontsize=11, y=1.02)
        plt.tight_layout()
        out_png = data_dir / (nc_path.stem + "_inspect.png")
        plt.savefig(out_png, dpi=100, bbox_inches="tight")
        plt.close()
        print(f"\n  Plot saved: {out_png}")
    except ImportError:
        print("\n  (matplotlib not installed — skipping plot)")

ds.close()
print()
