"""
01a_download_winds_era5.py
--------------------------
Download ERA5 monthly-mean 10 m wind components for a full year via the
Copernicus Climate Data Store (CDS) API.

Output:  data/era5_winds_<YEAR>.nc
         Contains variables u10 and v10, dimensions (time=12, lat, lon).

Prerequisites:
    pip install cdsapi
    ~/.cdsapirc must contain your CDS API key — see guide for setup.

Usage:
    python python/01a_download_winds_era5.py [--year 2023]
"""

import argparse
import pathlib
import sys

# ── argument parsing ──────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="Download ERA5 10 m winds via CDS API")
parser.add_argument("--year", type=int, default=2023,
                    help="Year to download (default: 2023)")
args = parser.parse_args()
YEAR = args.year

# ── paths ─────────────────────────────────────────────────────────────────────
DATA_DIR = pathlib.Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
OUTPUT   = DATA_DIR / f"era5_winds_{YEAR}.nc"

if OUTPUT.exists():
    print(f"[skip] {OUTPUT} already exists. Delete it to re-download.")
    sys.exit(0)

# ── import cdsapi ─────────────────────────────────────────────────────────────
try:
    import cdsapi
except ImportError:
    print("ERROR: cdsapi not installed. Run:  pip install cdsapi")
    sys.exit(1)

cdsapirc = pathlib.Path.home() / ".cdsapirc"
if not cdsapirc.exists():
    print("ERROR: ~/.cdsapirc not found.")
    print("  1. Register at https://cds.climate.copernicus.eu")
    print("  2. Copy your API key from your profile page")
    print("  3. Create ~/.cdsapirc:")
    print("       url: https://cds.climate.copernicus.eu/api")
    print("       key: <your-uid:api-key>")
    print("\nAlternative: use the NCEP fallback (no key required):")
    print("  python python/01b_download_winds_ncep.py")
    sys.exit(1)

# ── build the CDS request ─────────────────────────────────────────────────────
# reanalysis-era5-single-levels-monthly-means
# product_type: monthly_averaged_reanalysis
# variables:   10m_u_component_of_wind, 10m_v_component_of_wind
# All 12 months, time 00:00 (required by this product)
# Format: netcdf

months = [f"{m:02d}" for m in range(1, 13)]

request = {
    "product_type": "monthly_averaged_reanalysis",
    "variable": [
        "10m_u_component_of_wind",
        "10m_v_component_of_wind",
    ],
    "year":  str(YEAR),
    "month": months,
    "time":  "00:00",
    "data_format": "netcdf",
    "download_format": "unarchived",
}

print(f"Requesting ERA5 monthly-mean 10 m winds for {YEAR} (all 12 months)...")
print(f"Output: {OUTPUT}")
print("This request is queued on the CDS server and may take a few minutes.")
print("Leave the terminal open — the download will start automatically.\n")

# ── submit to CDS ─────────────────────────────────────────────────────────────
c = cdsapi.Client()
c.retrieve(
    "reanalysis-era5-single-levels-monthly-means",
    request,
    str(OUTPUT),
)

print(f"\nDownload complete: {OUTPUT}")
print(f"File size: {OUTPUT.stat().st_size / 1e6:.1f} MB")
print("\nNext: python python/03_inspect_netcdf.py data/era5_winds_{YEAR}.nc")
print("Then: python python/04_process_to_json.py --source era5 --year {YEAR}")
