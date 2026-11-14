"""
02_download_currents_godas.py
------------------------------
Download GODAS (Global Ocean Data Assimilation System) ocean current
velocity components from NOAA PSL.  NO API KEY REQUIRED.

GODAS variables:
  ucur  — eastward ocean current velocity (m/s in current files; check the units attribute)
  vcur  — northward ocean current velocity (m/s in current files)
  Dimensions: (time=12, level=40, lat=418, lon=360)
  Level coordinate: depth in metres (0.5 m to ~4478 m)
  We will use level index 0 (depth ≈ 5 m) as the surface.

Output:
  data/godas_ucur_<YEAR>.nc
  data/godas_vcur_<YEAR>.nc

Usage:
    python python/02_download_currents_godas.py [--year 2023]
"""

import argparse
import pathlib
import sys

try:
    import requests
except ImportError:
    print("ERROR: requests not installed. Run:  pip install requests")
    sys.exit(1)

# ── arguments ─────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="Download GODAS ocean currents (no auth)")
parser.add_argument("--year", type=int, default=2023)
args = parser.parse_args()
YEAR = args.year

DATA_DIR = pathlib.Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

BASE_URL = "https://downloads.psl.noaa.gov/Datasets/godas"
FILES = {
    f"godas_ucur_{YEAR}.nc": f"ucur.{YEAR}.nc",
    f"godas_vcur_{YEAR}.nc": f"vcur.{YEAR}.nc",
}

def download_file(url: str, dest: pathlib.Path) -> None:
    if dest.exists():
        print(f"  [skip] {dest.name} already exists ({dest.stat().st_size/1e6:.1f} MB)")
        return
    print(f"  Requesting {url}")
    with requests.get(url, stream=True, timeout=300) as r:
        if r.status_code == 404:
            raise FileNotFoundError(
                f"File not found: {url}\n"
                f"  GODAS data for {YEAR} may not be available yet.\n"
                f"  Try --year 2022."
            )
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        downloaded = 0
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)
                downloaded += len(chunk)
                if total:
                    pct = downloaded / total * 100
                    mb  = downloaded / 1e6
                    print(f"  {mb:6.1f} MB / {total/1e6:.1f} MB  ({pct:.0f}%)\r",
                          end="", flush=True)
    size_mb = dest.stat().st_size / 1e6
    print(f"\n  Saved {dest.name}  ({size_mb:.1f} MB)")

print(f"\nDownloading GODAS ocean current components for {YEAR} from NOAA PSL ...")
print("No API key required.  File sizes ~100 MB each — please be patient.\n")

for local_name, remote_name in FILES.items():
    url  = f"{BASE_URL}/{remote_name}"
    dest = DATA_DIR / local_name
    try:
        download_file(url, dest)
    except FileNotFoundError as e:
        print(f"\n{e}")
        sys.exit(1)
    except requests.exceptions.ConnectionError:
        print(f"\nERROR: Cannot reach {BASE_URL}")
        sys.exit(1)
    except requests.exceptions.HTTPError as e:
        print(f"\nHTTP error: {e}")
        sys.exit(1)

# ── quick inspect to confirm variable names ───────────────────────────────────
print("\nInspecting downloaded files ...")
try:
    import xarray as xr
    for local_name in FILES:
        path = DATA_DIR / local_name
        ds = xr.open_dataset(path)
        print(f"\n  {path.name}")
        for var in ds.data_vars:
            v   = ds[var]
            dim = " × ".join(str(s) for s in v.shape)
            units = v.attrs.get("units", "?")
            print(f"    Variable: {var}  shape=({dim})  units={units}")
        for coord in ("level", "depth", "lev"):
            if coord in ds.coords:
                lev_vals = ds[coord].values
                print(f"    {coord} values: {lev_vals[:5]} ... (showing first 5 of {len(lev_vals)})")
                print(f"    Surface level (index 0) ≈ {lev_vals[0]} m")
                break
        ds.close()
except ImportError:
    print("  (xarray not installed — skipping inspect; file saved successfully)")

print(f"\nNext: python python/04_process_to_json.py --source godas --year {YEAR}")
