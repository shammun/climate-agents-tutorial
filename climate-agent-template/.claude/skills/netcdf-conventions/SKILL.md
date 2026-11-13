---
name: netcdf-conventions
description: Project conventions for reading, checking and writing climate NetCDF files (coordinate names, longitude convention, units, calendars, attributes). Use whenever code opens or writes a .nc file.
---

# NetCDF conventions for this project

## Opening files
- Open with `xr.open_dataset(path)`; for files larger than 2 GB use `chunks={"time": 12}`.
- To get a quick summary of any file, run the helper:
  `python .claude/skills/netcdf-conventions/scripts/inspect_nc.py <file>`

## Coordinate names
Rename coordinates right after opening, so every script sees the same names:

| Found in file              | Rename to |
|----------------------------|-----------|
| latitude, nav_lat, y (deg) | lat       |
| longitude, nav_lon, x (deg)| lon       |
| valid_time (ERA5 from CDS) | time      |

- Latitude must increase (south to north). If it decreases, use `ds.sortby("lat")`.

## Longitude
- Convert to -180..180 before selecting a region:
  `ds = ds.assign_coords(lon=((ds.lon + 180) % 360) - 180).sortby("lon")`

## Units
| Variable              | Raw unit in ERA5     | Unit used in this project | Conversion |
|-----------------------|----------------------|---------------------------|------------|
| 2 m temperature (t2m) | K                    | °C                        | subtract 273.15 |
| total precipitation   | m (accumulated)      | mm/day                    | multiply by 1000; for monthly means the value is already per day |
| 10 m wind (u10, v10)  | m s-1                | m s-1                     | none |

Always update the `units` attribute after a conversion.

## Calendars
- ERA5 and most observations: standard (Gregorian) calendar.
- Many CMIP6 models: `noleap` or `360_day`. Open them with `use_cftime=True`.
- Never subtract or merge time axes from different calendars without converting first
  (`ds.convert_calendar("standard", align_on="date")`).

## Writing files
Every NetCDF written to data/processed/ must have, for each variable:
- `units` and `long_name`
- a global `history` attribute naming the script that wrote it, for example
  `ds.attrs["history"] = "written by scripts/03_jja_mean.py"`
