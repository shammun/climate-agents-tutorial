---
name: era5-download
description: How to download ERA5 reanalysis data from the Copernicus Climate Data Store (CDS) with the cdsapi package, including the helper script, request format, variable names and units. Use whenever ERA5 data is needed.
---

# Downloading ERA5 data

## Before the first download
1. A free CDS account and its API key are needed. The key goes in the file `~/.cdsapirc`:
   ```
   url: https://cds.climate.copernicus.eu/api
   key: <your-personal-access-token>
   ```
2. The dataset licence must be accepted once on the dataset's web page on the CDS site.
3. If `~/.cdsapirc` does not exist, stop and ask the user to create it. Never write the key yourself.

## Use the helper script
Monthly means (small, fast — the default):
```
python .claude/skills/era5-download/scripts/download_era5.py \
    --variable 2m_temperature --start 1991 --end 2024 \
    --area 39.5 -83.7 36.5 -75.2 --name virginia --outdir data/raw/era5
```
- `--area` order is North West South East, in degrees.
- The script sends one request per year and skips years whose file already exists.
- Add `--hourly` for hourly data (much larger; consider fewer years).

## Common variables
| CDS request name          | Short name in file | Unit |
|---------------------------|--------------------|------|
| 2m_temperature            | t2m                | K    |
| total_precipitation       | tp                 | m (monthly means: m per day) |
| 10m_u_component_of_wind   | u10                | m s-1 |
| 10m_v_component_of_wind   | v10                | m s-1 |
| skin_temperature          | skt                | K    |

## Things to watch
- Files from the current CDS name the time coordinate `valid_time`. Rename it to `time`.
- Recent months can carry an `expver` coordinate (preliminary data). Note it in SOURCE.md.
- Requests are queued on the CDS side; a request can wait several minutes before it starts.
