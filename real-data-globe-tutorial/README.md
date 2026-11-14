# Real-Data Globe Tutorial

Animate **real prevailing winds** (ERA5 10 m u/v) and **real ocean surface currents** (GODAS) as glowing particles on an interactive Three.js globe — the same visual style as the hero section of the main tutorial site.

Unlike the hand-drawn path version in `hero-globe-tutorial/`, every particle here follows an actual gridded velocity field derived from climate reanalysis data.

---

## What you will build

| File | What it shows |
|---|---|
| `html/01_wind_globe.html` | 800 wind particles advected from ERA5 annual-mean 10 m winds |
| `html/02_current_globe.html` | 400 ocean current particles from GODAS, speed-coloured teal→orange |
| `html/03_combined_globe.html` | Both layers simultaneously with toggle buttons |

---

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Python | ≥ 3.10 | Data download and processing scripts |
| Node.js | ≥ 20 | Already installed if you ran `npm install` in the parent project |
| A modern browser | Chrome, Edge, Firefox or Safari | WebGL |

---

## Quick start (3 steps)

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Download and process data
#    ERA5 path (requires CDS API key — see guide/REAL_DATA_GLOBE_GUIDE.md Part 1):
python python/01a_download_winds_era5.py
python python/02_download_currents_godas.py
python python/04_process_to_json.py --source era5 --year 2023
python python/04_process_to_json.py --source godas --year 2023

#    No CDS key? Use the NCEP fallback instead:
python python/01b_download_winds_ncep.py
python python/04_process_to_json.py --source ncep --year 2023

# 3. Open html/01_wind_globe.html in your browser (double-clicking the file works).
#    Serving over HTTP also works: python -m http.server 8080
#    then open http://localhost:8080/html/01_wind_globe.html
```

---

## Directory structure

```
real-data-globe-tutorial/
├── README.md               ← you are here
├── requirements.txt        ← Python packages
├── data/                   ← downloaded .nc files and generated .json go here
├── python/
│   ├── 00_check_setup.py   ← verify your environment before anything else
│   ├── 01a_download_winds_era5.py
│   ├── 01b_download_winds_ncep.py   ← fallback, no API key needed
│   ├── 02_download_currents_godas.py
│   ├── 03_inspect_netcdf.py
│   ├── 04_process_to_json.py
│   └── 05_verify_json.py
├── html/
│   ├── 01_wind_globe.html
│   ├── 02_current_globe.html
│   └── 03_combined_globe.html
└── guide/
    └── REAL_DATA_GLOBE_GUIDE.md   ← comprehensive step-by-step walkthrough
```

---

## Full guide

See **[guide/REAL_DATA_GLOBE_GUIDE.md](guide/REAL_DATA_GLOBE_GUIDE.md)** for a complete explanation of every step — data sources, processing pipeline, visualization architecture, and how to extend the tutorial.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `ModuleNotFoundError: cdsapi` | `pip install -r requirements.txt` |
| `FileNotFoundError: ~/.cdsapirc` | See Part 1 of the guide for CDS API key setup |
| Globe renders but no particles, top bar says "no data yet" | Run `python/04_process_to_json.py`; it writes `data/winds.js` / `data/currents.js` that the pages load |
| Particles all stuck at equator | The JSON file has bad data; run `python/05_verify_json.py` to diagnose |
