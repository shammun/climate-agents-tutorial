"""
01b_download_winds_ncep.py
--------------------------
Fallback wind download — NO API KEY REQUIRED.
Downloads NCEP/NCAR Reanalysis 1 six-hourly 10 m wind components for one year from
NOAA PSL (Physical Sciences Laboratory) public FTP/HTTP mirror.

Output:  data/ncep_uwnd_<YEAR>.nc   (u-component, m/s)
         data/ncep_vwnd_<YEAR>.nc   (v-component, m/s)

Coordinate note:
  NCEP files use a T62 Gaussian grid (192 × 94 lat/lon).
  04_process_to_json.py --source ncep handles the regridding.

Usage:
    python python/01b_download_winds_ncep.py [--year 2023]
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
parser = argparse.ArgumentParser(description="Download NCEP/NCAR 10 m winds (no auth)")
parser.add_argument("--year", type=int, default=2023)
args = parser.parse_args()
YEAR = args.year

DATA_DIR = pathlib.Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# Yearly files of 6-hourly values live in ncep.reanalysis/ (not .derived/,
# which only holds multi-year monthly-mean files). 04_process_to_json.py
# averages over all time steps, so 6-hourly input gives the annual mean.
BASE_URL = "https://downloads.psl.noaa.gov/Datasets/ncep.reanalysis/surface_gauss"
FILES = {
    f"ncep_uwnd_{YEAR}.nc": f"uwnd.10m.gauss.{YEAR}.nc",
    f"ncep_vwnd_{YEAR}.nc": f"vwnd.10m.gauss.{YEAR}.nc",
}

def download_file(url: str, dest: pathlib.Path) -> None:
    if dest.exists():
        print(f"  [skip] {dest.name} already exists")
        return
    print(f"  Downloading {url}")
    print(f"  → {dest}")
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        downloaded = 0
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):  # 1 MiB chunks
                f.write(chunk)
                downloaded += len(chunk)
                if total:
                    pct = downloaded / total * 100
                    mb  = downloaded / 1e6
                    print(f"  {mb:6.1f} MB / {total/1e6:.1f} MB  ({pct:.0f}%)\r",
                          end="", flush=True)
    print(f"\n  Done: {dest.stat().st_size / 1e6:.1f} MB")

print(f"\nDownloading NCEP/NCAR 10 m winds for {YEAR} from NOAA PSL...")
print("No API key required. File sizes ~50 MB each.\n")

for local_name, remote_name in FILES.items():
    url  = f"{BASE_URL}/{remote_name}"
    dest = DATA_DIR / local_name
    try:
        download_file(url, dest)
    except requests.exceptions.HTTPError as e:
        print(f"\nERROR downloading {url}: {e}")
        print("  The year may not be available yet. Try --year 2022.")
        sys.exit(1)
    except requests.exceptions.ConnectionError:
        print(f"\nERROR: Cannot reach {BASE_URL}")
        print("  Check your internet connection.")
        sys.exit(1)

print("\nAll downloads complete.")
print(f"\nNext: python python/03_inspect_netcdf.py data/ncep_uwnd_{YEAR}.nc")
print(f"Then: python python/04_process_to_json.py --source ncep --year {YEAR}")
