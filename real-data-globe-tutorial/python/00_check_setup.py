"""
00_check_setup.py
-----------------
Verify that everything needed for the real-data globe tutorial is in place.
Run this first before any other script.

Usage:
    python python/00_check_setup.py
"""

import sys
import os
import pathlib

# ── ANSI colour helpers ────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

def ok(label, detail=""):
    suffix = f"  ({detail})" if detail else ""
    print(f"  {GREEN}PASS{RESET}  {label}{suffix}")

def fail(label, detail=""):
    suffix = f"  ({detail})" if detail else ""
    print(f"  {RED}FAIL{RESET}  {label}{suffix}")

def warn(label, detail=""):
    suffix = f"  ({detail})" if detail else ""
    print(f"  {YELLOW}WARN{RESET}  {label}{suffix}")

# ── 1. Python version ─────────────────────────────────────────────────────────
print(f"\n{BOLD}1. Python version{RESET}")
major, minor = sys.version_info[:2]
ver_str = f"{major}.{minor}.{sys.version_info[2]}"
if major >= 3 and minor >= 10:
    ok(f"Python {ver_str} (≥ 3.10 required)")
else:
    fail(f"Python {ver_str} — need 3.10 or newer",
         "Download from https://python.org")

# ── 2. Required packages ──────────────────────────────────────────────────────
print(f"\n{BOLD}2. Required packages{RESET}")
packages = {
    "cdsapi":      "CDS API client for ERA5 download",
    "xarray":      "labelled N-D arrays for NetCDF",
    "netCDF4":     "NetCDF4 file backend",
    "numpy":       "numerical arrays",
    "scipy":       "interpolation (RegularGridInterpolator)",
    "matplotlib":  "plots and verification figures",
    "requests":    "HTTP downloads for NCEP/GODAS",
}
all_pkg_ok = True
for pkg, purpose in packages.items():
    try:
        mod = __import__(pkg)
        version = getattr(mod, "__version__", "?")
        ok(f"{pkg}  v{version}", purpose)
    except ImportError:
        fail(f"{pkg}", f"not installed — pip install {pkg}")
        all_pkg_ok = False

if not all_pkg_ok:
    print(f"\n  → Run:  {YELLOW}pip install -r requirements.txt{RESET}\n")

# ── 3. CDS API key ────────────────────────────────────────────────────────────
print(f"\n{BOLD}3. CDS API key (~/.cdsapirc){RESET}")
cdsapirc = pathlib.Path.home() / ".cdsapirc"
if cdsapirc.exists():
    text = cdsapirc.read_text()
    has_url = "url" in text
    has_key = "key" in text
    if has_url and has_key:
        ok(".cdsapirc exists and contains url + key")
    else:
        warn(".cdsapirc exists but may be incomplete",
             "must contain both 'url:' and 'key:' lines")
else:
    warn(".cdsapirc not found",
         "ERA5 download (01a) will fail; use NCEP fallback (01b) instead")
    print(f"  To create it:")
    print(f"    1. Register at https://cds.climate.copernicus.eu")
    print(f"    2. Copy your API key from your profile page")
    print(f"    3. Create ~/.cdsapirc with these two lines:")
    print(f"         url: https://cds.climate.copernicus.eu/api")
    print(f"         key: <your-key-here>")

# ── 4. Data directory ─────────────────────────────────────────────────────────
print(f"\n{BOLD}4. Data directory{RESET}")
# Script lives in python/, data lives in ../data/
script_dir = pathlib.Path(__file__).parent
data_dir   = script_dir.parent / "data"
if data_dir.is_dir():
    ok(f"data/ directory exists at {data_dir}")
else:
    fail(f"data/ directory not found at {data_dir}")
    print(f"  → Run:  mkdir {data_dir}")

# Check for already-processed JSON
winds_json    = data_dir / "winds.json"
currents_json = data_dir / "currents.json"
if winds_json.exists():
    ok(f"winds.json present ({winds_json.stat().st_size // 1024} KB)")
else:
    warn("winds.json not yet generated",
         "run 01a or 01b, then 04_process_to_json.py --source ... --year 2023")
if currents_json.exists():
    ok(f"currents.json present ({currents_json.stat().st_size // 1024} KB)")
else:
    warn("currents.json not yet generated",
         "run 02_download_currents_godas.py, then 04_process_to_json.py --source godas")

# ── 5. Three.js (bundled with the tutorial) ───────────────────────────────────
print(f"\n{BOLD}5. Three.js (html/three.global.min.js){RESET}")
three_js = script_dir.parent / "html" / "three.global.min.js"
if three_js.exists():
    size_kb = three_js.stat().st_size // 1024
    ok(f"three.global.min.js found ({size_kb} KB)")
else:
    warn("three.global.min.js not found",
         f"expected at {three_js}")
    print(f"  → From the parent project directory run:  node tools/make_three_global.mjs {three_js}")

# ── Summary ───────────────────────────────────────────────────────────────────
print(f"\n{BOLD}Next step:{RESET}")
if not (winds_json.exists() and currents_json.exists()):
    print("  Download data:  python python/01a_download_winds_era5.py")
    print("                  python python/02_download_currents_godas.py")
    print("  Process data:   python python/04_process_to_json.py --source era5 --year 2023")
    print("                  python python/04_process_to_json.py --source godas --year 2023")
else:
    print("  All data ready. Open html/01_wind_globe.html in your browser (double-click works).")
print()
