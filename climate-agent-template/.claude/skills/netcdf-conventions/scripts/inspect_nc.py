"""Print a quick quality summary of a NetCDF file.

Usage:
    python inspect_nc.py path/to/file.nc

Prints dimensions, coordinates (with ranges), calendar, time gaps,
and per-variable units, value range and missing-value fraction.
Read-only: the file is never modified.
"""
import sys

import numpy as np
import xarray as xr


def describe_time(ds):
    if "time" not in ds.coords:
        for alt in ("valid_time", "t"):
            if alt in ds.coords:
                ds = ds.rename({alt: "time"})
                print(f"  note: time coordinate is named '{alt}' (rename to 'time')")
                break
        else:
            print("  time: none found")
            return
    t = ds["time"]
    cal = t.encoding.get("calendar", t.attrs.get("calendar", "standard (assumed)"))
    print(f"  time: {t.size} steps, {str(t.values[0])[:10]} .. {str(t.values[-1])[:10]}, calendar = {cal}")
    if t.size > 2:
        vals = t.values
        try:
            steps = np.diff(vals).astype("timedelta64[D]").astype(int)
            uniq, counts = np.unique(steps, return_counts=True)
            print(f"  time step sizes (days): {dict(zip(uniq.tolist(), counts.tolist()))}")
        except (TypeError, ValueError):
            print("  time step sizes: not computed (non-standard calendar objects)")
        n_dup = t.size - np.unique(vals).size
        print(f"  duplicate time steps: {n_dup}")


def main(path):
    try:
        import dask  # noqa: F401  (lazy loading keeps memory low for big files)
        ds = xr.open_dataset(path, chunks={})
    except ImportError:
        ds = xr.open_dataset(path)
    print(f"FILE: {path}")
    print(f"  dims: {dict(ds.sizes)}")

    for name in ("lat", "latitude", "lon", "longitude"):
        if name in ds.coords:
            c = ds[name].values
            order = "increasing" if c[-1] > c[0] else "decreasing"
            print(f"  {name}: {c.min():.3f} .. {c.max():.3f} ({c.size} points, {order})")
    lon_name = "lon" if "lon" in ds.coords else ("longitude" if "longitude" in ds.coords else None)
    if lon_name is not None:
        convention = "0..360" if float(ds[lon_name].max()) > 180 else "-180..180"
        print(f"  longitude convention: {convention}")

    describe_time(ds)

    for var in ds.data_vars:
        da = ds[var]
        units = da.attrs.get("units", "MISSING")
        if not np.issubdtype(da.dtype, np.number):
            print(f"  VAR {var}: non-numeric ({da.dtype}), skipped")
            continue
        nan_frac = float(da.isnull().mean())
        vmin, vmean, vmax = (float(da.min()), float(da.mean()), float(da.max()))
        fill = da.encoding.get("_FillValue", "not set")
        print(f"  VAR {var}: units = {units}, min/mean/max = {vmin:.3f} / {vmean:.3f} / {vmax:.3f}, "
              f"NaN fraction = {nan_frac:.4f}, _FillValue = {fill}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
